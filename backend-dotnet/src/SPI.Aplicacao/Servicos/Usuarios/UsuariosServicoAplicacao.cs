using SPI.Application.DTOs.Users;
using SPI.Application.Interfaces;
using SPI.Application.Mappings;
using SPI.Application.Services.Access;
using SPI.Domain.Enums;
using SPI.Domain.Repositories;
using SPI.Domain.ValueObjects;

namespace SPI.Application.Services;

public sealed class UsersAppService : IUsersAppService
{
    private readonly IUserRepository _userRepository;
    private readonly IGroupRepository _groupRepository;
    private readonly IGroupsAppService _groupsAppService;
    private readonly IUnitOfWork _unitOfWork;

    public UsersAppService(IUserRepository userRepository, IGroupRepository groupRepository, IGroupsAppService groupsAppService, IUnitOfWork unitOfWork)
    {
        _userRepository = userRepository;
        _groupRepository = groupRepository;
        _groupsAppService = groupsAppService;
        _unitOfWork = unitOfWork;
    }

    public async Task<IReadOnlyCollection<UserResponseDto>> ListAsync(Guid actorUserId, CancellationToken cancellationToken = default)
    {
        var actor = await _userRepository.GetDetailedByIdAsync(actorUserId, cancellationToken)
            ?? throw new UnauthorizedAccessException("Usuario autenticado nao encontrado.");

        if (!actor.Role.CanManageUsers())
        {
            throw new UnauthorizedAccessException("Usuario sem permissao para listar usuarios.");
        }

        var accessScope = AccessScopeResolver.Resolve(actor);
        IReadOnlyCollection<SPI.Domain.Entities.User> users;
        if (actor.Role == UserRole.Admin)
        {
            users = await _userRepository.ListAsync(cancellationToken);
        }
        else
        {
            var allInScope = await _userRepository.ListByGroupIdsAsync(accessScope.ManagedGroupIds, cancellationToken);
            users = allInScope.Where(u => u.Role != UserRole.Admin).ToArray();
        }

        return users.Select(x => x.ToDto()).ToList();
    }

    public async Task DeactivateAsync(Guid userId, Guid actorUserId, CancellationToken cancellationToken = default)
    {
        var actor = await _userRepository.GetDetailedByIdAsync(actorUserId, cancellationToken)
            ?? throw new UnauthorizedAccessException("Usuario autenticado nao encontrado.");

        if (!actor.Role.CanManageUsers())
        {
            throw new UnauthorizedAccessException("Usuario sem permissao para desativar usuarios.");
        }

        var accessScope = AccessScopeResolver.Resolve(actor);
        var user = await _userRepository.GetDetailedByIdAsync(userId, cancellationToken)
            ?? throw new KeyNotFoundException("Usuario nao encontrado.");

        var targetGroupIds = user.GroupMemberships.Select(x => x.GroupId).Distinct().ToArray();
        if (actor.Role == UserRole.Admin && user.Role != UserRole.Analyst && targetGroupIds.Any(x => !accessScope.OperationalGroupIds.Contains(x)))
        {
            throw new UnauthorizedAccessException("Administrador so pode desativar usuarios dos grupos aos quais esta vinculado.");
        }

        if (actor.Role.HasManagerPrivileges())
        {
            if (user.Role is UserRole.Admin or UserRole.Analyst)
            {
                throw new UnauthorizedAccessException("Perfil de gestao nao pode desativar este tipo de usuario.");
            }

            if (targetGroupIds.Any() && targetGroupIds.Any(x => !accessScope.ManagedGroupIds.Contains(x)))
            {
                throw new UnauthorizedAccessException("Perfil de gestao so pode desativar usuarios dos grupos que gerencia.");
            }
        }

        user.Deactivate();
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }

    public async Task<UserResponseDto> UpdateAsync(
        Guid userId,
        UpdateUserRequestDto request,
        Guid actorUserId,
        CancellationToken cancellationToken = default)
    {
        var actor = await _userRepository.GetDetailedByIdAsync(actorUserId, cancellationToken)
            ?? throw new UnauthorizedAccessException("Usuario autenticado nao encontrado.");

        if (!actor.Role.CanManageUsers())
        {
            throw new UnauthorizedAccessException("Usuario sem permissao para editar usuarios.");
        }

        var user = await _userRepository.GetDetailedByIdAsync(userId, cancellationToken)
            ?? throw new KeyNotFoundException("Usuario nao encontrado.");

        var targetRole = UserRoleExtensions.FromApiValue(request.Role);
        var existingUser = await _userRepository.GetByEmailAsync(request.Email, cancellationToken);
        if (existingUser is not null && existingUser.Id != user.Id)
        {
            throw new InvalidOperationException("Ja existe usuario com este email.");
        }

        var requestedGroupIds = targetRole == UserRole.Analyst
            ? []
            : await ResolveRequestedGroupIdsAsync(request.GroupIds, cancellationToken);

        EnsureCanEditUser(actor, user, targetRole, requestedGroupIds);

        user.UpdateProfile(request.Nome, new Email(request.Email));
        user.ChangeRole(targetRole);
        await _userRepository.ReplaceGroupMembershipsAsync(user.Id, requestedGroupIds, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        if (actor.Role == UserRole.Admin && targetRole == UserRole.Manager)
        {
            var adminScope = AccessScopeResolver.Resolve(actor);
            var selectedGroupId = requestedGroupIds
                .FirstOrDefault(x => adminScope.OperationalGroupIds.Contains(x));

            if (selectedGroupId != Guid.Empty)
            {
                await _groupsAppService.AssignManagerAsync(selectedGroupId, user.Id, cancellationToken);
            }
        }

        var updatedUser = await _userRepository.GetDetailedByIdAsync(user.Id, cancellationToken)
            ?? throw new InvalidOperationException("Nao foi possivel carregar o usuario atualizado.");

        return updatedUser.ToDto();
    }

    public async Task UpdateGroupsAsync(
        Guid userId,
        UpdateUserGroupsRequestDto request,
        Guid actorUserId,
        CancellationToken cancellationToken = default)
    {
        var actor = await _userRepository.GetDetailedByIdAsync(actorUserId, cancellationToken)
            ?? throw new UnauthorizedAccessException("Usuario autenticado nao encontrado.");

        if (!actor.Role.CanManageUsers())
        {
            throw new UnauthorizedAccessException("Usuario sem permissao para alterar grupos.");
        }

        var user = await _userRepository.GetDetailedByIdAsync(userId, cancellationToken)
            ?? throw new KeyNotFoundException("Usuario nao encontrado.");

        var allRequestedGroups = await _groupRepository.ListByIdsAsync(
            request.GroupIds.Where(x => x != Guid.Empty).Distinct().ToArray(),
            cancellationToken);

        var requestedGroupIds = allRequestedGroups
            .Select(g => g.Id)
            .OrderBy(x => x)
            .ToArray();

        var validCount = request.GroupIds.Where(x => x != Guid.Empty).Distinct().Count();
        if (allRequestedGroups.Count != validCount)
        {
            throw new KeyNotFoundException("Um ou mais grupos informados nao existem.");
        }

        if (user.Role == UserRole.Analyst && requestedGroupIds.Length > 0)
        {
            throw new UnauthorizedAccessException("Analistas nao podem ser vinculados a grupos.");
        }


        if (actor.Role.HasManagerPrivileges())
        {
            var accessScope = AccessScopeResolver.Resolve(actor);
            if (user.Role is UserRole.Admin or UserRole.Analyst)
            {
                throw new UnauthorizedAccessException("Perfil de gestao nao pode alterar grupos deste tipo de usuario.");
            }

            if (requestedGroupIds.Any(x => !accessScope.ManagedGroupIds.Contains(x)))
            {
                throw new UnauthorizedAccessException("Perfil de gestao so pode vincular usuarios aos grupos que gerencia.");
            }

            var currentGroupIds = user.GroupMemberships.Select(x => x.GroupId).Distinct().ToArray();
            if (currentGroupIds.Any(x => !accessScope.ManagedGroupIds.Contains(x)))
            {
                throw new UnauthorizedAccessException("Perfil de gestao so pode alterar usuarios dentro dos grupos que gerencia.");
            }
        }

        await _userRepository.ReplaceGroupMembershipsAsync(userId, requestedGroupIds, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        if (actor.Role == UserRole.Admin && user.Role == UserRole.Manager)
        {
            var adminScope = AccessScopeResolver.Resolve(actor);
            var selectedGroupId = requestedGroupIds
                .FirstOrDefault(x => adminScope.OperationalGroupIds.Contains(x));

            if (selectedGroupId != Guid.Empty)
            {
                await _groupsAppService.AssignManagerAsync(selectedGroupId, user.Id, cancellationToken);
            }
        }
    }

    private async Task<Guid[]> ResolveRequestedGroupIdsAsync(
        IReadOnlyCollection<Guid> groupIds,
        CancellationToken cancellationToken)
    {
        var cleanedGroupIds = groupIds
            .Where(x => x != Guid.Empty)
            .Distinct()
            .OrderBy(x => x)
            .ToArray();

        if (cleanedGroupIds.Length == 0)
        {
            return [];
        }

        var groups = await _groupRepository.ListByIdsAsync(cleanedGroupIds, cancellationToken);
        if (groups.Count != cleanedGroupIds.Length)
        {
            throw new KeyNotFoundException("Um ou mais grupos informados nao existem.");
        }

        return groups
            .Select(x => x.Id)
            .OrderBy(x => x)
            .ToArray();
    }

    private static void EnsureCanEditUser(
        SPI.Domain.Entities.User actor,
        SPI.Domain.Entities.User user,
        UserRole targetRole,
        IReadOnlyCollection<Guid> requestedGroupIds)
    {
        if (actor.Role.HasManagerPrivileges())
        {
            var accessScope = AccessScopeResolver.Resolve(actor);
            var currentGroupIds = user.GroupMemberships.Select(x => x.GroupId).Distinct().ToArray();

            if (user.Role is UserRole.Admin or UserRole.Analyst || targetRole is UserRole.Admin or UserRole.Analyst)
            {
                throw new UnauthorizedAccessException("Perfil de gestao nao pode editar administradores ou analistas.");
            }

            if (requestedGroupIds.Any(x => !accessScope.ManagedGroupIds.Contains(x)))
            {
                throw new UnauthorizedAccessException("Perfil de gestao so pode vincular usuarios as equipes que gerencia.");
            }

            if (currentGroupIds.Any(x => !accessScope.ManagedGroupIds.Contains(x)))
            {
                throw new UnauthorizedAccessException("Perfil de gestao so pode editar usuarios dentro das equipes que gerencia.");
            }
        }
    }
}



