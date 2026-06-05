
export class CookieUtils {
    setCookie(response: any, name: string, value: string, options: any) {
        response.cookie(name, value, options);
    }

    clearCookie(response: any, name: string, options: any) {
        response.clearCookie(name, options);
    }

    getCookie(request: any, name: string): string | undefined {
        const cookies = request.cookies as Record<string, string | undefined> | undefined;
        return cookies?.[name];
    }

    cookieOptions(configService: any, isAcessToken: boolean = false) {
        return {
            httpOnly: true,
            secure: configService.get('COOKIE_SECURE', { infer: true }),
            sameSite: configService.get('COOKIE_SAME_SITE', { infer: true }),
            domain: configService.get('COOKIE_DOMAIN', { infer: true }) || undefined,
            maxAge: isAcessToken
                ? configService.get('ACCESS_TOKEN_TTL_SECONDS', { infer: true }) * 1000
                : configService.get('REFRESH_TOKEN_TTL_SECONDS', { infer: true }) * 1000,
            path: '/',
        } as const;
    }
}
