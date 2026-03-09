export const parseTarget = (
  value: string
): { hostedZoneId: string; recordName: string } => {
  const colonIndex = value.indexOf(':');
  if (colonIndex === -1) {
    throw new Error(
      `Invalid target format: "${value}". Expected hostedZoneId:domainName`
    );
  }

  const [hostedZoneId, recordName] = value.split(':');

  if (!hostedZoneId || !recordName) {
    throw new Error(
      `Invalid target format: "${value}". Both hostedZoneId and domainName are required`
    );
  }

  return {
    hostedZoneId,
    recordName: recordName.endsWith('.') ? recordName : `${recordName}.`
  };
};

export const parseTtl = (value: string) => {
  const number = parseInt(value, 10);
  if (isNaN(number)) {
    throw new Error(`Not valid number: ttl: ${value}`);
  }
  return number;
};
