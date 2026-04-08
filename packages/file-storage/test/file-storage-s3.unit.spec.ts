import { FileStorageS3 } from '../src/lib/file-storage-s3.class';

describe('FileStorageS3.extractRegionFromEndpoint', () => {
  const cases: Array<[string, string | null]> = [
    // AWS
    ['https://s3.eu-west-1.amazonaws.com', 'eu-west-1'],
    ['https://my-bucket.s3.us-east-2.amazonaws.com', 'us-east-2'],
    ['s3.ap-southeast-1.amazonaws.com', 'ap-southeast-1'],
    // OVH
    ['https://s3.gra.perf.cloud.ovh.net', 'gra'],
    ['https://s3.gra.cloud.ovh.net', 'gra'],
    ['https://s3.sbg.cloud.ovh.net/some/path', 'sbg'],
    // DigitalOcean Spaces
    ['https://fra1.digitaloceanspaces.com', 'fra1'],
    ['nyc3.digitaloceanspaces.com', 'nyc3'],
    // Unknown / unsupported
    ['https://minio.local:9000', null],
    ['https://storage.googleapis.com', null],
    ['', null],
  ];

  it.each(cases)('%s -> %s', (endpoint, expected) => {
    expect(FileStorageS3.extractRegionFromEndpoint(endpoint)).toBe(expected);
  });
});

// eslint-disable-next-line max-lines-per-function
describe('FileStorageS3 constructor wiring', () => {
  it('throws when neither region nor extractable endpoint is provided', () => {
    expect(
      () =>
        new FileStorageS3({
          bucket: 'b',
          maxPayloadSize: 1,
          endpoint: 'https://minio.local:9000',
        } as never),
    ).toThrow(/region is missing/i);
  });

  it('accepts an AWS endpoint and derives the region', () => {
    const fs = new FileStorageS3({
      bucket: 'b',
      maxPayloadSize: 1,
      endpoint: 'https://s3.eu-west-1.amazonaws.com',
    } as never);
    expect(fs.config.s3.config.region).toBeDefined();
  });

  it('forwards endpoint to the underlying S3 client', async () => {
    const fs = new FileStorageS3({
      bucket: 'b',
      maxPayloadSize: 1,
      endpoint: 'https://s3.gra.perf.cloud.ovh.net',
    } as never);
    const endpoint = await fs.config.s3.config.endpoint?.();
    expect(endpoint).toBeDefined();
    expect(endpoint?.hostname).toBe('s3.gra.perf.cloud.ovh.net');
  });

  it('forwards forcePathStyle to the underlying S3 client', async () => {
    const fs = new FileStorageS3({
      bucket: 'b',
      maxPayloadSize: 1,
      region: 'us-east-1',
      endpoint: 'https://minio.local:9000',
      forcePathStyle: true,
    } as never);
    const fps = fs.config.s3.config.forcePathStyle;
    const resolved = typeof fps === 'function' ? await (fps as () => Promise<boolean>)() : fps;
    expect(resolved).toBe(true);
  });

  it('accepts region and endpoint together (SigV4 requires region)', async () => {
    const fs = new FileStorageS3({
      bucket: 'b',
      maxPayloadSize: 1,
      region: 'us-east-1',
      endpoint: 'https://minio.local:9000',
    } as never);
    expect(await fs.config.s3.config.region()).toBe('us-east-1');
    const endpoint = await fs.config.s3.config.endpoint?.();
    expect(endpoint?.hostname).toBe('minio.local');
  });
});
