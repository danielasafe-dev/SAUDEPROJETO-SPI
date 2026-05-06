using SPI.Domain.Entities;
using SPI.Domain.Repositories;
using SPI.Infrastructure.Data.Persistence;
using Microsoft.EntityFrameworkCore;

namespace SPI.Infrastructure.Data.Repositories;

public sealed class FormRepository : IFormRepository
{
    private readonly AppDbContext _context;

    public FormRepository(AppDbContext context)
    {
        _context = context;
    }

    public Task<List<FormTemplate>> ListAsync(bool includeInactive = false, CancellationToken cancellationToken = default) =>
        DetailedQuery()
            .AsNoTracking()
            .Where(x => includeInactive || x.Ativo)
            .OrderBy(x => x.Nome)
            .ToListAsync(cancellationToken);

    public Task<List<FormTemplate>> ListByGroupIdsAsync(IReadOnlyCollection<Guid> groupIds, bool includeInactive = false, CancellationToken cancellationToken = default) =>
        DetailedQuery()
            .AsNoTracking()
            .Where(x => (includeInactive || x.Ativo) && (x.GroupId == null || groupIds.Contains(x.GroupId.Value)))
            .OrderBy(x => x.Nome)
            .ToListAsync(cancellationToken);

    public Task<List<FormTemplate>> ListByOrganizationIdAsync(Guid organizationId, bool includeInactive = false, CancellationToken cancellationToken = default) =>
        DetailedQuery()
            .AsNoTracking()
            .Where(x => (includeInactive || x.Ativo) && x.OrganizationId == organizationId)
            .OrderBy(x => x.Nome)
            .ToListAsync(cancellationToken);

    public Task<FormTemplate?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default) =>
        _context.FormTemplates
            .Include(x => x.Questions).ThenInclude(q => q.Options)
            .Include(x => x.ClassificationRanges)
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

    public Task<FormTemplate?> GetDetailedByIdAsync(Guid id, CancellationToken cancellationToken = default) =>
        _context.FormTemplates
            .Include(x => x.Group)
            .Include(x => x.CriadoPorUsuario)
            .Include(x => x.Questions).ThenInclude(q => q.Options)
            .Include(x => x.ClassificationRanges)
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

    public Task AddAsync(FormTemplate formTemplate, CancellationToken cancellationToken = default) =>
        _context.FormTemplates.AddAsync(formTemplate, cancellationToken).AsTask();

    private IQueryable<FormTemplate> DetailedQuery() =>
        _context.FormTemplates
            .Include(x => x.Group)
            .Include(x => x.CriadoPorUsuario)
            .Include(x => x.Questions).ThenInclude(q => q.Options)
            .Include(x => x.ClassificationRanges);
}



