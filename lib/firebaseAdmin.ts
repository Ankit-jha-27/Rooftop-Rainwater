import admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: "new-rtrwh",
      clientEmail: "firebase-adminsdk-fbsvc@new-rtrwh.iam.gserviceaccount.com",
      privateKey:
        "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDZV2EjYECKUE9J\nXA5SCjBH4UmvPWd4cxh88qmt9R1Kelv6tCjUUpZOqRo1ebEX4JoIlD8DAG4Y7fIN\nG/Th56v+hu9bMTY5pmKRZmbZM73Pk3SBLj7esCXDh54gBYQtk8VRv412qbklcfv1\n5DJY8PEpTWh6dsNPMzuyfa5d5fXsPYLFnLnEaU0aeCo4L/24iRUl/Uub4sRBkvqc\nBsweiYOxslY0gcc0hjyh9emQviXWX6RTmhLztIuASXORTiYb2y6sUddnnyDAWtRV\n7uEdmIOdcisgePFQja6Aq0UzAFQk03Ttigc0hRwmKk2c1msu15RpYkArWl1fYM/J\nWA7YT5ErAgMBAAECggEAGgy2ENZlhe5wQlutP7oG5WakPUO/1hj9c2RmX/pEA3w8\n8ASN7Dzl1RHBmW03g6Qg8ixKjSKND6HdZCLYrAbnf39OywBP/oLpx4GdjCT+eBW1\nXhJb6Lb2H8RueGoQ2KGggdbSrslS7qEF0QgD3NMsJIYpopv/dsuuOQuFTa3VVvYj\n26pHsLOGEy0leDL1QNiEqCUWC88J+lyYiw+SOagOaGcHqKCvQy3jeLt0bs3rBN/3\nKnDpfn9KNX/n6/967qfol/nDU/FT7sh5fKwhuYPBeT35ylFXm5SXOeytIeBS/Kxj\nPezORhK0tJKf3yAdRyKMbcHe9d82QeByBp3JHPsF6QKBgQDwQ5ZyIj/TSse0VunE\nb/Z6a2nO/5dba9FqQ3YOsKfs7kE9/GuKwQE+xBNCG8n3zw3L751W+i9d6UTZ2mPW\newIIW7aLHzv6HPZOouBjwz8RitI/HDHWoeOq2QQ2lpUVIX5mog3yvj+4feaOjI9g\nWuY6X/hU/FpNIXeE4CE1w9BBnwKBgQDnk3TAL+RbtQ4z8A56mgY4SIRbwzSBVIPn\nw/Kyw7+gl0Rgz0vqpyu8spt4fDXKZ9JAV3hJqm37qvWxWI1VAFgda9+ZJChcgc+b\nRQr0+OuM1G1OuXH2o7UJRrshj5A1XcJeKhw5ZCa6iPeAkBDtt13LkqS4tX8ZCddO\nRAz6TDC89QKBgCHXc0ZqOpE5VD27jDvGBXKi1Il6iMgwvJN6IxPYoB6IRJpFhqRJ\noTJFDe1e2qjT+j6CZqgMn0VcCP2ifDOGqfeha2nXIWyOTccvu+lxY93Fru2CvCZe\nMSIsZSKHPUJ3sEUmiE5rq7AB08q6U6ufwhPw1pqp3NJGZ35Iz4SyKxBDAoGBAM1b\neQw5LDObIoYyWlSko+FjhWRuffA2h2aO4Hlgl12M5wlGqxbiuily5eX5mCXu3YdL\nShNhfHjSCWEEmwiG7pzgnX+LjfNC9lzF5EqLNy9C7dADKanDUPZx7956FjMM+yFQ\nDIlkY+fFMF6k4y47DoVJfKOD57rHfFQeirenuwzFAoGAUGk19g2qvA4tVvYZL9xs\n9cbVvuL76KEqUKcVN2LS/9HE7Jhal2xxWwmD2+GvjfWRR4VCttNkrqeRgX+PUW3e\ns7uE7yIaLTq8aR2UHIxCrSReLAVYyaAMrBC1rhBQJNZlJ0eRHuxQYmDo1QhQhSYZ\nVTObEXbeX9oFpfrI7wP4hDk=\n-----END PRIVATE KEY-----\n".replace(
          /\\n/g,
          "\n"
        ),
    }),
  });
}

export const adminAuth = admin.auth();
export const adminDb = admin.firestore();
