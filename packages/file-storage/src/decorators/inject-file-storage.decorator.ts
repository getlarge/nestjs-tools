import { Inject } from '@nestjs/common';

import { FILE_STORAGE_STRATEGY_TOKEN } from '../constants';

export const InjectFileStorageStrategy = () => Inject(FILE_STORAGE_STRATEGY_TOKEN);
