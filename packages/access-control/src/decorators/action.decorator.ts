import { SetMetadata } from '@nestjs/common';

import { ACTION_NAME_METADATA } from '../constants';

export const Action = (name: string) => SetMetadata(ACTION_NAME_METADATA, name);
// eslint-disable-next-line @typescript-eslint/ban-types
export const getAction = (target: Function) => Reflect.getMetadata(ACTION_NAME_METADATA, target);
