/*
 * glibc 2.38 shim for older glibc (e.g. Debian 12 / glibc 2.36).
 *
 * The embedded MongoDB engine binaries (npm: @0q/embedded-mongodb-linux-x64-gnu)
 * are built against glibc 2.38 but only need seven symbols from it: the C23
 * strto/scanf variants and fmod's newer symbol version. This shim provides
 * drop-in implementations used together with a relabel of the single
 * GLIBC_2.38 verneed entry to an older version the system glibc does provide.
 *
 * Build:
 *   gcc -shared -fPIC -O2 -o glibc238shim.so glibc238shim.c \
 *       -Wl,--version-script=glibc238shim.map
 */
#define _GNU_SOURCE
#include <stdio.h>
#include <stdlib.h>
#include <stdarg.h>
#include <string.h>
#include <ctype.h>
#include <errno.h>
#include <stddef.h>
#include <math.h>

/* ---------- C23 strto family ----------
 * C23 allows ' as a digit separator and 0b/0B binary prefixes. We build a
 * normalized copy plus a map back to the original buffer so endptr stays
 * correct, then delegate to the classic functions.
 */
static char *build_clean(const char *nptr, int *base, size_t *out_len, size_t **map_out) {
    size_t len = strlen(nptr);
    char *buf = (char *)malloc(len + 2);
    size_t *map = (size_t *)malloc((len + 2) * sizeof(size_t));
    if (!buf || !map) { free(buf); free(map); return NULL; }

    size_t i = 0, o = 0;
    /* copy leading whitespace verbatim so offsets line up */
    while (i < len && isspace((unsigned char)nptr[i])) { buf[o] = nptr[i]; map[o] = i; i++; o++; }

    /* C23 binary prefix when base is 0 or 2 */
    if ((*base == 0 || *base == 2) &&
        i + 1 < len && nptr[i] == '0' && (nptr[i + 1] == 'b' || nptr[i + 1] == 'B') &&
        i + 2 < len && (isalnum((unsigned char)nptr[i + 2]) || nptr[i + 2] == '\'')) {
        buf[o] = '0'; map[o] = i; i++; o++;   /* keep "0" as the radix marker */
        i++;                                  /* skip b/B */
        *base = 2;
    }

    for (; i < len; i++) {
        if (nptr[i] == '\'') continue;        /* drop digit separators */
        buf[o] = nptr[i]; map[o] = i; o++;
    }
    buf[o] = '\0'; map[o] = len;
    *out_len = o;
    *map_out = map;
    return buf;
}

long __isoc23_strtol(const char *nptr, char **endptr, int base) {
    int b = base; size_t clen = 0; size_t *map = NULL;
    char *clean = build_clean(nptr, &b, &clen, &map);
    if (!clean) { errno = ENOMEM; return 0; }
    char *cend = NULL;
    long r = strtol(clean, &cend, b);
    if (endptr) *endptr = (char *)nptr + (cend && cend >= clean ? map[cend - clean] : 0);
    free(clean); free(map);
    return r;
}

unsigned long __isoc23_strtoul(const char *nptr, char **endptr, int base) {
    int b = base; size_t clen = 0; size_t *map = NULL;
    char *clean = build_clean(nptr, &b, &clen, &map);
    if (!clean) { errno = ENOMEM; return 0; }
    char *cend = NULL;
    unsigned long r = strtoul(clean, &cend, b);
    if (endptr) *endptr = (char *)nptr + (cend && cend >= clean ? map[cend - clean] : 0);
    free(clean); free(map);
    return r;
}

long long __isoc23_strtoll(const char *nptr, char **endptr, int base) {
    int b = base; size_t clen = 0; size_t *map = NULL;
    char *clean = build_clean(nptr, &b, &clen, &map);
    if (!clean) { errno = ENOMEM; return 0; }
    char *cend = NULL;
    long long r = strtoll(clean, &cend, b);
    if (endptr) *endptr = (char *)nptr + (cend && cend >= clean ? map[cend - clean] : 0);
    free(clean); free(map);
    return r;
}

unsigned long long __isoc23_strtoull(const char *nptr, char **endptr, int base) {
    int b = base; size_t clen = 0; size_t *map = NULL;
    char *clean = build_clean(nptr, &b, &clen, &map);
    if (!clean) { errno = ENOMEM; return 0; }
    char *cend = NULL;
    unsigned long long r = strtoull(clean, &cend, b);
    if (endptr) *endptr = (char *)nptr + (cend && cend >= clean ? map[cend - clean] : 0);
    free(clean); free(map);
    return r;
}

/* scanf family: C23 adds %b (binary) conversion; MongoDB never uses it.
 * Delegating to the classic v*scanf implementations is behaviorally correct
 * for every format string in practice. */
int __isoc23_sscanf(const char *str, const char *fmt, ...) {
    va_list ap;
    va_start(ap, fmt);
    int r = vsscanf(str, fmt, ap);
    va_end(ap);
    return r;
}

int __isoc23_fscanf(FILE *stream, const char *fmt, ...) {
    va_list ap;
    va_start(ap, fmt);
    int r = vfscanf(stream, fmt, ap);
    va_end(ap);
    return r;
}

/* fmod: the engine links against a glibc 2.38 symbol version of fmod that
 * predates nothing behaviorally — fmod is exactly representable when both
 * operands are doubles, so routing through fmodl is bit-for-bit identical. */
double fmod(double x, double y) {
    return (double)fmodl((long double)x, (long double)y);
}
