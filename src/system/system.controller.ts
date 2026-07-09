import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { IntegrationStatusMapResponseDto } from 'src/admin/dto/admin-response.dto';
import { IntegrationValidationService } from 'src/admin/integration-validation.service';

@ApiTags('System')
@Controller('system')
export class SystemController {
  constructor(
    private readonly integrationValidationService: IntegrationValidationService
  ) {}

  @Get('health')
  @ApiOkResponse({
    schema: {
      example: {
        status: 'ok'
      }
    }
  })
  health() {
    return { status: 'ok' };
  }

  @Get('integrations/test')
  @ApiOkResponse({ type: IntegrationStatusMapResponseDto })
  testIntegrations() {
    return this.integrationValidationService.validateConnections();
  }
}
