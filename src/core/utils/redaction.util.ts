export class RedactionUtil {
  private static readonly sensitiveKeys = [
    'password',
    'pass',
    'token',
    'authorization',
    'refreshToken',
    'otp',
    'secret',
  ];

  static redact(value: any): any {
    if (Array.isArray(value)) {
      return value.map((item) => this.redact(item));
    }

    if (value && typeof value === 'object') {
      return Object.entries(value).reduce((acc, [key, val]) => {
        if (this.sensitiveKeys.some((sensitiveKey) => sensitiveKey.toLowerCase() === key.toLowerCase())) {
          acc[key] = '[REDACTED]';
          return acc;
        }

        acc[key] = this.redact(val);
        return acc;
      }, {} as Record<string, any>);
    }

    return value;
  }

  static stringifyPayload(value: any): string {
    try {
      const json = JSON.stringify(value);
      return json.length > 500 ? `${json.slice(0, 500)}...` : json;
    } catch (error) {
      return '[unserializable-payload]';
    }
  }
}
