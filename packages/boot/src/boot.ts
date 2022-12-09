import { Logger, LoggerService, LogLevel, NestApplicationOptions, VersioningType } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter, NestExpressApplication } from '@nestjs/platform-express';
import { OpenAPIObject } from '@nestjs/swagger';
import { EventHandlers, TypedEventEmitter } from '@s1seven/typed-event-emitter';
import chalk from 'chalk';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { AsyncAPIObject } from 'nestjs-asyncapi';
import { URL } from 'url';

import { getMainServerUrl, setupAsyncApi, setupOpenApi } from './api-specs';
import { BaseConfig, BootOptions, defaultOptions, SetupOptions } from './options';

declare const module: any;

export interface ApplicationBootEvents extends EventHandlers {
  starting: () => void;
  started: (app: NestExpressApplication) => void;
  error: (error: Error) => void;
}

export class ApplicationBoot<Conf extends BaseConfig> extends TypedEventEmitter<ApplicationBootEvents> {
  readonly logger: Logger;
  private _options: BootOptions<Conf>;
  private _config: Conf;
  private _app: NestExpressApplication;

  static async fromSetup<C extends BaseConfig>(
    bootOptions: BootOptions<C>,
    setup: SetupOptions = {},
  ): Promise<ApplicationBoot<C>> {
    const applicationBoot = new ApplicationBoot<C>(bootOptions);
    await applicationBoot.bootstrap(setup);
    return applicationBoot;
  }

  static init<C extends BaseConfig>(bootOptions: BootOptions<C>): ApplicationBoot<C> {
    const applicationBoot = new ApplicationBoot<C>(bootOptions);
    const setup = { workerId: applicationBoot.options.workerId };
    applicationBoot.bootstrap(setup);
    return applicationBoot;
  }

  static async initAsync<C extends BaseConfig>(bootOptions: BootOptions<C>): Promise<ApplicationBoot<C>> {
    const applicationBoot = new ApplicationBoot<C>(bootOptions);
    const setup = { workerId: applicationBoot.options.workerId };
    await applicationBoot.bootstrap(setup);
    return applicationBoot;
  }

  constructor(bootOptions: BootOptions<Conf>) {
    super({ captureRejections: true });
    this.options = { ...defaultOptions, ...bootOptions };
    this.logger =
      this.options.logger instanceof Logger ? this.options.logger : new Logger(this.options.loggerName || 'Bootstrap');
    if (!this.options.AppModule && typeof this.options.appModuleFactory !== 'function') {
      throw new Error('`AppModule` or `appModuleFactory` is required in bootOptions');
    }
  }

  get options(): BootOptions<Conf> {
    return this._options;
  }

  set options(value: BootOptions<Conf>) {
    this._options = value;
  }

  get config(): Conf {
    return this._config;
  }

  set config(value: Conf) {
    this._config = value;
  }

  get app(): NestExpressApplication {
    return this._app;
  }

  set app(value: NestExpressApplication) {
    this._app = value;
  }

  logInfo(): void {
    const { asyncApi, openApi, serviceName } = this.options;
    const { asyncApiPath, brokerUrl, environment, swaggerPath } = this.config;
    const logger = this.logger;
    const url = getMainServerUrl(this.config);
    logger.log(chalk.blue.bold(`✅ ${serviceName} server is running on 👉 ${url}`));
    if (brokerUrl) {
      const brokerUrlObject = new URL(brokerUrl);
      brokerUrlObject.username = '*****';
      brokerUrlObject.password = '*****';
      logger.log(chalk.blue.bold(`✅ ${serviceName} microservice connecting to 👉 ${brokerUrlObject.href}`));
    }
    if (openApi?.enableExplorer) {
      logger.log(chalk.green.bold(`📄 Swagger 👉 ${url}/${swaggerPath}`));
    }
    if (asyncApi?.enableExplorer) {
      logger.log(chalk.green.bold(`📄 AsyncAPI 👉 ${url}/${asyncApiPath}`));
    }
    logger.log(chalk.green.bold(`🩺 Check Health 👉 ${url}/health`));
    logger.log(chalk.red.bold(`🚀 Application is running in ${environment} environment`));
  }

  setupOpenApi(): Promise<OpenAPIObject> {
    return setupOpenApi(this.app, this.options, this.config);
  }

  setupAsyncApi(): Promise<AsyncAPIObject> {
    return setupAsyncApi(this.app, this.options, this.config);
  }

  setStaticAssets(staticAssets: BootOptions<Conf>['staticAssets']): void {
    if (staticAssets?.length) {
      staticAssets.forEach((staticAsset) => {
        this.app.useStaticAssets(staticAsset.path, staticAsset.options);
      });
    }
  }

  setGlobalFilters(globalFilters: BootOptions<Conf>['globalFilters']): void {
    if (globalFilters?.length) {
      globalFilters.forEach((filter) => {
        this.app.useGlobalFilters(filter);
      });
    }
  }

  setGlobalInterceptors(globalInterceptors: BootOptions<Conf>['globalInterceptors']): void {
    if (globalInterceptors?.length) {
      globalInterceptors.forEach((interceptor) => {
        this.app.useGlobalInterceptors(interceptor);
      });
    }
  }

  setGlobalPipes(globalPipes: BootOptions<Conf>['globalPipes']): void {
    if (globalPipes?.length) {
      globalPipes.forEach((pipe) => {
        this.app.useGlobalPipes(pipe);
      });
    }
  }

  setGlobalGuards(globalGuards: BootOptions<Conf>['globalGuards']): void {
    if (globalGuards?.length) {
      globalGuards.forEach((guard) => {
        this.app.useGlobalGuards(guard);
      });
    }
  }

  setCompression(compressionOptions: BootOptions<Conf>['compressionOptions']): void {
    if (compressionOptions && typeof compressionOptions === 'boolean') {
      this.app.use(compression());
    } else if (typeof compressionOptions === 'object') {
      this.app.use(compression(compressionOptions));
    }
  }

  setCookieParser(cookieParserOptions: BootOptions<Conf>['cookieParserOptions']): void {
    if (cookieParserOptions && typeof cookieParserOptions === 'boolean') {
      this.app.use(cookieParser());
    } else if (typeof cookieParserOptions === 'object') {
      this.app.use(cookieParser(cookieParserOptions.secret, cookieParserOptions.options));
    }
  }

  setCors(corsOptions: BootOptions<Conf>['corsOptions']): void {
    if (corsOptions && typeof corsOptions === 'boolean') {
      this.app.enableCors();
    } else if (typeof corsOptions === 'object') {
      this.app.enableCors(corsOptions);
    }
  }

  setHelmet(helmetOptions: BootOptions<Conf>['helmetOptions']): void {
    if (helmetOptions && typeof helmetOptions === 'boolean') {
      this.app.use(helmet());
    } else if (typeof helmetOptions === 'object') {
      this.app.use(helmet(helmetOptions));
    }
  }

  setRateLimit(rateLimitOptions: BootOptions<Conf>['rateLimitOptions']): void {
    if (rateLimitOptions && typeof rateLimitOptions === 'boolean') {
      this.app.use(rateLimit());
    } else if (typeof rateLimitOptions === 'object') {
      this.app.use(rateLimit(rateLimitOptions));
    }
  }

  setMicroservices(enableMicroservices: BootOptions<Conf>['enableMicroservices']): void {
    const { microservices, hybridOptions = [] } = this.config;
    if (enableMicroservices && microservices?.length) {
      microservices.forEach((option, index) => {
        const transport = 'transport' in option ? option.transport : null;
        const strategy = 'strategy' in option ? option.strategy : null;
        const options = transport ? { options: option.options, transport } : { options: option.options, strategy };
        const microserviceHybridOptions = hybridOptions[index] || { inheritAppConfig: false };
        this.app.connectMicroservice(options, microserviceHybridOptions);
      });
    }
  }

  setVersioning(versioningOptions: BootOptions<Conf>['versioningOptions']) {
    if (versioningOptions && typeof versioningOptions === 'boolean') {
      this.app.enableVersioning({
        type: VersioningType.HEADER,
        header: 'x-api-version',
      });
    } else if (typeof versioningOptions === 'object') {
      this.app.enableVersioning(versioningOptions);
    }
  }

  setupApp(): void {
    const app = this.app;
    const {
      compressionOptions,
      cookieParserOptions,
      corsOptions,
      enableMicroservices,
      enableShutdownHooks,
      globalFilters,
      globalInterceptors,
      globalPipes,
      globalGuards,
      globalPrefix,
      helmetOptions = {},
      rateLimitOptions,
      staticAssets,
      versioningOptions,
    } = this.options;

    if (globalPrefix) {
      app.setGlobalPrefix(globalPrefix);
    }
    this.setStaticAssets(staticAssets);
    this.setGlobalFilters(globalFilters);
    this.setGlobalInterceptors(globalInterceptors);
    this.setGlobalPipes(globalPipes);
    this.setGlobalGuards(globalGuards);
    this.setCompression(compressionOptions);
    this.setCookieParser(cookieParserOptions);
    this.setCors(corsOptions);
    this.setHelmet(helmetOptions);
    this.setRateLimit(rateLimitOptions);
    this.setVersioning(versioningOptions);

    // TODO: restrict trusted proxies in prod
    app.set('trust proxy', 1);
    if (enableShutdownHooks) {
      app.enableShutdownHooks();
    }
    this.setMicroservices(enableMicroservices);
  }

  setLogger(): LoggerService | LogLevel[] {
    let logger: LoggerService | LogLevel[];
    if (this.options.logger instanceof Logger) {
      logger = this.options.logger;
    } else if (this.options.logLevels?.length) {
      logger = this.options.logLevels;
    } else {
      logger = this.logger;
    }
    return logger;
  }

  async getAppModule() {
    if (typeof this.options.appModuleFactory === 'function') {
      return this.options.appModuleFactory();
    }
    return this.options.AppModule;
  }

  async bootstrap(setupOptions: SetupOptions = {}): Promise<NestExpressApplication | null> {
    const AppModule = await this.getAppModule();
    const { bodyParser = false, bufferLogs } = setupOptions;
    const appConfig: NestApplicationOptions = { bodyParser, logger: this.setLogger(), bufferLogs };
    const server = express();
    server.disable('x-powered-by');
    try {
      const app = await NestFactory.create<NestExpressApplication>(AppModule, new ExpressAdapter(server), appConfig);
      this.app = app;
      this.config = this.options.config(app);
      const { serviceIdentifier, serverPort } = this.config;
      if (typeof setupOptions.preSetup === 'function') {
        await setupOptions.preSetup(app);
      }
      this.setupApp();
      if (this.options.openApi) {
        await this.setupOpenApi();
      }
      if (this.options.asyncApi) {
        await this.setupAsyncApi();
      }
      if (typeof setupOptions.postSetup === 'function') {
        await setupOptions.postSetup(app);
      }
      this.emit('starting');
      if (serviceIdentifier) {
        this.logger.log(chalk.blue.bold(`Microservice Identitier : ${serviceIdentifier}`));
      }
      await app.init();
      if (typeof setupOptions.postInit === 'function') {
        await setupOptions.postInit(app);
      }
      if (this.options.enableMicroservices) {
        await app.startAllMicroservices();
      }
      await app.listen(serverPort);
      this.emit('started', app);
      if (module?.hot) {
        module.hot.accept();
        module.hot.dispose(() => app.close());
      }
      return app;
    } catch (error) {
      this.emit('error', error);
      return null;
    }
  }

  async close(): Promise<void> {
    this.removeAllListeners();
    await this.app.close();
  }
}
