import { SetMetadata, Type } from '@nestjs/common';

import { RESOURCE_NAME_METADATA } from '../constants';

export const Resource = (name: string) => SetMetadata(RESOURCE_NAME_METADATA, name);
// eslint-disable-next-line @typescript-eslint/ban-types
export const getResource = <T = any>(target: Type<T> | Function) => Reflect.getMetadata(RESOURCE_NAME_METADATA, target);
