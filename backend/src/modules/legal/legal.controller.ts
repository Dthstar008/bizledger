import { Controller, Get, Header } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LegalDetails, privacyPolicyHtml, termsHtml } from './legal-content';

/** Public pages: app stores and the sign-up screen link to these URLs. */
@Controller('legal')
export class LegalController {
  constructor(private readonly config: ConfigService) {}

  private details(): LegalDetails {
    return {
      entityName: this.config.get<string | null>('legal.entityName') ?? null,
      address: this.config.get<string | null>('legal.address') ?? null,
      email: this.config.get<string | null>('legal.email') ?? null,
      reviewed: this.config.get<boolean>('legal.reviewed') ?? false,
    };
  }

  @Get('privacy')
  @Header('Content-Type', 'text/html; charset=utf-8')
  @Header('Cache-Control', 'public, max-age=3600')
  privacy() {
    return privacyPolicyHtml(this.details());
  }

  @Get('terms')
  @Header('Content-Type', 'text/html; charset=utf-8')
  @Header('Cache-Control', 'public, max-age=3600')
  terms() {
    return termsHtml(this.details());
  }
}
