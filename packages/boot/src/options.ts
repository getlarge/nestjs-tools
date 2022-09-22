import type {
  CanActivate,
  ExceptionFilter,
  LoggerService,
  LogLevel,
  NestApplicationOptions,
  NestHybridApplicationOptions,
  NestInterceptor,
  PipeTransform,
  VersioningOptions,
} from '@nestjs/common';
import type { CorsOptions, CorsOptionsDelegate } from '@nestjs/common/interfaces/external/cors-options.interface';
import { ConfigService } from '@nestjs/config';
import type { MicroserviceOptions } from '@nestjs/microservices';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { ServeStaticOptions } from '@nestjs/platform-express/interfaces/serve-static-options.interface';
import type {
  ExternalDocumentationObject,
  SecurityRequirementObject,
  SecuritySchemeObject,
} from '@nestjs/swagger/dist/interfaces/open-api-spec.interface';
import type { CompressionOptions } from 'compression';
import type { CookieParseOptions } from 'cookie-parser';
import type { Options as RateLimiterOptions } from 'express-rate-limit';
import type { HelmetOptions } from 'helmet';
import { AsyncSecuritySchemeObject } from 'nestjs-asyncapi';

export type BaseConfig = Readonly<{
  brokerUrl?: string;
  microservices?: MicroserviceOptions[];
  hybridOptions?: NestHybridApplicationOptions[];
  environment: string;
  serviceIdentifier?: string;
  proxyServerUrl?: string;
  proxyServerUrls?: string[];
  serverHostname: string;
  serverPort: number;
  serverUrl: string;
  swaggerPath?: string;
  asyncApiPath?: string;
}>;

export type ApiContact = { name: string; url: string; email: string };
export type ApiExternalDoc = { description: string; url: string };
export type ApiLicense = { name: string; url: string };
export type ApiFilePath = string | ((app?: NestExpressApplication) => string);
export type ApiTag = {
  resource: string;
  description: string;
  externalDocs?: ExternalDocumentationObject;
};

export type OpenApiOptions = {
  contacts?: ApiContact[];
  customSiteTitle?: string | ((app?: NestExpressApplication) => string);
  customFavIcon?: string | ((app?: NestExpressApplication) => string);
  enableExplorer?: boolean | ((app?: NestExpressApplication) => boolean);
  externalDocs?: ApiExternalDoc[];
  extraModels?: Function[]; // eslint-disable-line @typescript-eslint/ban-types
  filePath?: ApiFilePath;
  licenses?: ApiLicense[];
  securityRequirements: string[] | SecurityRequirementObject[];
  securitySchemes: { name: string; scheme: SecuritySchemeObject }[];
  tags?: ApiTag[];
  terms?: string[];
};

export type AsyncApiOptions = {
  contacts?: ApiContact[];
  defaultContentType?: string;
  enableExplorer?: boolean | ((app?: NestExpressApplication) => boolean);
  externalDocs?: ApiExternalDoc[];
  extraModels?: Function[]; // eslint-disable-line @typescript-eslint/ban-types
  filePath?: ApiFilePath;
  licenses?: ApiLicense[];
  securityRequirements?: string[];
  securitySchemes?: { name: string; scheme: AsyncSecuritySchemeObject }[];
  tags?: ApiTag[];
  terms?: string[];
};

export type BootOptions<Config extends BaseConfig> = {
  serviceName: string;
  serviceDescription: string;
  serviceVersion: string;
  workerId?: number;
  config: (app?: NestExpressApplication) => Config;
  AppModule: Function; // eslint-disable-line @typescript-eslint/ban-types
  openApi?: OpenApiOptions;
  asyncApi?: AsyncApiOptions;
  loggerName?: string;
  logger?: LoggerService;
  logLevels?: LogLevel[];
  staticAssets?: { path: string; options?: ServeStaticOptions }[];
  globalFilters?: ExceptionFilter[];
  globalInterceptors?: NestInterceptor[];
  globalPipes?: PipeTransform[];
  globalGuards?: CanActivate[];
  globalPrefix?: string;
  enableMicroservices?: boolean;
  shareAppConfigWithMicroservices?: boolean;
  enableShutdownHooks?: boolean;
  versioningOptions?: boolean | VersioningOptions;
  corsOptions?: boolean | CorsOptions | CorsOptionsDelegate<any>;
  cookieParserOptions?: boolean | { secret?: string | string[]; options?: CookieParseOptions };
  compressionOptions?: boolean | CompressionOptions;
  helmetOptions?: boolean | HelmetOptions;
  rateLimitOptions?: boolean | Omit<Partial<RateLimiterOptions>, 'store'>;
};

export const defaultOptions: BootOptions<BaseConfig> = {
  serviceName: 'microservice',
  serviceDescription: 'A unique microservice',
  serviceVersion: '0.0.1',
  workerId: null,
  config: (app: NestExpressApplication) => {
    const configService: ConfigService = app.get(ConfigService);
    return {
      environment: configService.get('NODE_ENV'),
      proxyServerUrl: configService.get('PROXY_SERVER_URL'),
      proxyServerUrls: configService.get('PROXY_SERVER_URLS'),
      serverHostname: configService.get('HOSTNAME'),
      serverPort: configService.get('PORT'),
      serverUrl: configService.get('SERVER_URL'),
      swaggerPath: configService.get('SWAGGER_PATH', 'api'),
    };
  },
  AppModule: null,
  openApi: {
    filePath: null,
    extraModels: [],
    externalDocs: [],
    contacts: [],
    securityRequirements: [],
    securitySchemes: [],
    tags: [],
    enableExplorer: true,
  },
  asyncApi: {
    defaultContentType: 'application/json',
    filePath: null,
    extraModels: [],
    externalDocs: [],
    contacts: [],
    securityRequirements: [],
    securitySchemes: [],
    tags: [],
  },
  staticAssets: [],
  globalFilters: [],
  globalInterceptors: [],
  globalPipes: [],
  globalGuards: [],
  enableMicroservices: false,
  enableShutdownHooks: false,
  corsOptions: false,
  cookieParserOptions: false,
  compressionOptions: false,
  helmetOptions: {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'validator.swagger.io'],
        scriptSrc: ["'self'", "https: 'unsafe-inline'"],
      },
    },
  },
  rateLimitOptions: false,
};

export interface SetupOptions extends NestApplicationOptions {
  workerId?: number;
  preSetup?: (app?: NestExpressApplication) => Promise<void> | void;
  postSetup?: (app?: NestExpressApplication) => Promise<void> | void;
  postInit?: (app?: NestExpressApplication) => Promise<void> | void;
}
