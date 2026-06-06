import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
 import { Reflector } from '@nestjs/core';
 import { ApiKeyService } from '../../apiKey/apiKey.service';
 import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
 import { ApiKeyEntity } from '../../database/entities/apikey.entity';
import { Request } from 'express';
 
 export interface ApiKeyRequest extends Request {
   apiKey?: ApiKeyEntity;
 }
 
 @Injectable()
 export class ApiKeyGuard implements CanActivate {
   constructor(
     private readonly apiKeyService: ApiKeyService,
     private readonly reflector: Reflector,
   ) {}
 
  async canActivate(context: ExecutionContext): Promise<boolean> {
     // Check if route is public
     const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
       context.getHandler(),
       context.getClass(),
     ]);
 
     if (isPublic) {
       return true;
     }
 
    const req = context.switchToHttp().getRequest<ApiKeyRequest>();
    const raw = req.get('x-api-key') as string | undefined;
 
     if (!raw) {
       throw new UnauthorizedException('Missing X-API-Key header');
     }
 
     const key = await this.apiKeyService.validate(raw);
     req.apiKey = key; // Available as @Req() req.apiKey in controllers
     return true;
   }
 }
