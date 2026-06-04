import { ArgumentMetadata, Injectable, PipeTransform, Type, UnprocessableEntityException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

@Injectable()
export class AppValidationPipe implements PipeTransform<unknown> {
  async transform(value: unknown, metadata: ArgumentMetadata): Promise<unknown> {
    if (!metadata.metatype || !this.shouldValidate(metadata.metatype)) {
      return value;
    }

    const object = plainToInstance(metadata.metatype, value);
    const errors = await validate(object, {
      whitelist: true,
      forbidNonWhitelisted: true,
      forbidUnknownValues: true,
    });

    if (errors.length > 0) {
      const messages = errors.flatMap((error) => Object.values(error.constraints ?? {}));
      throw new UnprocessableEntityException(messages);
    }

    return object;
  }

  private shouldValidate(metatype: Type<unknown>): boolean {
    const excludedTypes: Array<Type<unknown>> = [String, Boolean, Number, Array, Object];
    return !excludedTypes.includes(metatype);
  }
}
