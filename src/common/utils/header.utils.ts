 export class HeaderUtils {
     getAccessToken(request: any): string | undefined {
         const authHeader = request.headers?.authorization || request.headers?.Authorization;
         if (!authHeader || typeof authHeader !== 'string') {
             return undefined;
         }
         
         if (authHeader.startsWith('Bearer ')) {
             return authHeader.substring(7);
         }
         
         return undefined;
     }
 
     getRefreshToken(request: any): string | undefined {
         return request.headers?.['x-refresh-token'] || request.headers?.['X-Refresh-Token'];
     }

     setTokenHeaders(response: any, accessToken: string, refreshToken: string) {
         response.setHeader('X-Access-Token', accessToken);
         response.setHeader('X-Refresh-Token', refreshToken);
     }
 

     clearTokenHeaders(response: any) {
         response.setHeader('X-Access-Token', '');
         response.setHeader('X-Refresh-Token', '');
     }
 }
