# turbo remote cache

## server

reference:
https://github.com/vercel/turbo/blob/main/cli/internal/client/client.go

Example request:

```
https://api.vercel.com/v8/artifacts/09b4848294e347d8?teamID=team_lMDgmODIeVfSbCQNQPDkX8cF
```

authentication over bearer token.

### data model

the cache will be saved in S3:

- bucket name is configured via environment variable `STORAGE_PATH`.
- the object key is `{teamSlug}/{hash}`.

### upload cache

```
PUT /v8/artifacts/:hash?slug=turbo-team
Authorization: Bearer {{token}}
header: x-artifact-client-ci
```

response:

```
{ok: true}

```

### download cache

```
GET /v8/artifacts/:hash?slug=turbo-team
Authorization: Bearer {{token}}
```

response:

```
200
Content-Length: n
Content-Type: application/octet-stream
x-artifact-tag: xxx

{ok: true}
```

error response:

```
404

{ok: false}
```

### RecordAnalyticsEvents

```
POST /v8/artifacts/events
Authorization: Bearer {{token}}
```

see details
[here](https://github.com/vercel/turbo/blob/baf5c94eac2edb2d6dc6db46644082fbd55fd57d/cli/internal/client/analytics.go#L9)

## client

Setup environment variable:

```
TURBO_API=http://localhost:41300
TURBO_TOKEN=foo
TURBO_TEAM=a-name
```

When using this remote cache implementation, a bogus `TURBO_TOKEN` works. It
suggests using the repo name as value of `TURBO_TEAM` to separate cache from
repo to repo.
