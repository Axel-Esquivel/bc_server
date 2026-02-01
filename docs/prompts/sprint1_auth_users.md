# Sprint 1 — Prompts

1) src/core/users/users.module.ts
2) src/core/users/models/user.model.ts
   - email único, name, passwordHash, OrganizationIds[], companyIds[], createdAt/updatedAt.
3) src/core/users/services/users.service.ts
   - create (hash recibido desde auth o aquí luego), findByEmail, findById.
4) src/core/users/controllers/users.controller.ts
   - POST /users (admin-only placeholder), GET /users/me (req.user).

5) src/core/auth/auth.module.ts
   - JwtModule.registerAsync con ConfigService; exporta AuthService.
6) src/core/auth/services/auth.service.ts
   - hashPassword, comparePasswords, signAccessToken, verifyToken.
7) src/core/auth/controllers/auth.controller.ts
   - POST /auth/login → busca user, compara pass, devuelve { user, accessToken }.

8) src/core/roles/* y src/core/permissions/*
   - Decorador @Permissions('module:action'), guard que chequea permisos (fixture).
9) src/core/Organizations/*
   - Organization { name, members: [{userId, role}] }, endpoints: invitar/cambiar rol.
10) src/core/devices/*
   - Device { userId, deviceId, name, lastSeenAt, ip }, PUT /devices/ping.
