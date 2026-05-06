using SPI.Application.DTOs.Forms;

namespace SPI.Application.Interfaces;

public interface IFormsAppService
{
    Task<IReadOnlyCollection<FormResponseDto>> ListAsync(Guid actorUserId, bool includeInactive = false, CancellationToken cancellationToken = default);
    Task<FormResponseDto?> GetByIdAsync(Guid formId, Guid actorUserId, CancellationToken cancellationToken = default);
    Task<FormResponseDto> CreateAsync(CreateFormRequestDto request, Guid actorUserId, CancellationToken cancellationToken = default);
    Task<FormResponseDto> UpdateAsync(Guid formId, UpdateFormRequestDto request, Guid actorUserId, CancellationToken cancellationToken = default);
    Task DeactivateAsync(Guid formId, Guid actorUserId, CancellationToken cancellationToken = default);
    Task ActivateAsync(Guid formId, Guid actorUserId, CancellationToken cancellationToken = default);
}



