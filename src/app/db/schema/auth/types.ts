// src/db/schema/auth/types.ts
import { positionType, scopeTypeEnum, assignmentKind } from './enums';

export type Position = (typeof positionType.enumValues)[number];
export type ScopeType = (typeof scopeTypeEnum.enumValues)[number];
export type Assignment = (typeof assignmentKind.enumValues)[number];