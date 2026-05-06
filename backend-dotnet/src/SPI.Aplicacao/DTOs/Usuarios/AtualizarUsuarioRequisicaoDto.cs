using System.ComponentModel.DataAnnotations;

namespace SPI.Application.DTOs.Users;

public sealed class UpdateUserRequestDto
{
    [Required]
    [MaxLength(200)]
    public string Nome { get; init; } = string.Empty;

    [Required]
    [EmailAddress]
    public string Email { get; init; } = string.Empty;

    [Required]
    public string Role { get; init; } = "agente_saude";

    public IReadOnlyCollection<Guid> GroupIds { get; init; } = [];
}
