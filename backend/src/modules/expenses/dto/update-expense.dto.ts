import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateExpenseDto } from './create-expense.dto';

/** The sync fields are fixed when an expense is created, so an edit can't change them. */
export class UpdateExpenseDto extends PartialType(OmitType(CreateExpenseDto, ['clientRef', 'occurredAt'] as const)) {}
