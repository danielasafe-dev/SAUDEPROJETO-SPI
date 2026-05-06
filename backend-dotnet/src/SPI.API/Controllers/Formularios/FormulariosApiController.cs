using SPI.Api.Extensions;
using SPI.Application.DTOs.Forms;
using SPI.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace SPI.Api.Controllers;

[ApiController]
[Route("api/forms")]
[Authorize(Policy = "FormAccess")]
public sealed class FormsController : ControllerBase
{
    private readonly IFormsAppService _formsAppService;

    public FormsController(IFormsAppService formsAppService)
    {
        _formsAppService = formsAppService;
    }

    [HttpGet]
    public async Task<IActionResult> List([FromQuery] bool includeInactive, CancellationToken cancellationToken)
    {
        var result = await _formsAppService.ListAsync(User.GetUserId(), includeInactive, cancellationToken);
        return Ok(result);
    }

    [HttpGet("{formId:guid}")]
    public async Task<IActionResult> GetById(Guid formId, CancellationToken cancellationToken)
    {
        var result = await _formsAppService.GetByIdAsync(formId, User.GetUserId(), cancellationToken);
        if (result is null)
        {
            return NotFound(new { detail = "Formulario nao encontrado" });
        }

        return Ok(result);
    }

    [HttpPost]
    [Authorize(Policy = "FormManagement")]
    public async Task<IActionResult> Create([FromBody] CreateFormRequestDto request, CancellationToken cancellationToken)
    {
        var result = await _formsAppService.CreateAsync(request, User.GetUserId(), cancellationToken);
        return Ok(result);
    }

    [HttpPut("{formId:guid}")]
    [Authorize(Policy = "FormManagement")]
    public async Task<IActionResult> Update(Guid formId, [FromBody] UpdateFormRequestDto request, CancellationToken cancellationToken)
    {
        var result = await _formsAppService.UpdateAsync(formId, request, User.GetUserId(), cancellationToken);
        return Ok(result);
    }

    [HttpDelete("{formId:guid}")]
    [Authorize(Policy = "FormManagement")]
    public async Task<IActionResult> Deactivate(Guid formId, CancellationToken cancellationToken)
    {
        await _formsAppService.DeactivateAsync(formId, User.GetUserId(), cancellationToken);
        return NoContent();
    }

    [HttpPatch("{formId:guid}/activate")]
    [Authorize(Policy = "FormManagement")]
    public async Task<IActionResult> Activate(Guid formId, CancellationToken cancellationToken)
    {
        await _formsAppService.ActivateAsync(formId, User.GetUserId(), cancellationToken);
        return NoContent();
    }
}



