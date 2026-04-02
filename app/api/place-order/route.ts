import { NextRequest, NextResponse } from 'next/server';
import { ClobClient, OrderType } from '@polymarket/clob-client';
import { BuilderConfig } from '@polymarket/builder-signing-sdk';
import { MAINNET } from '@/config/networks';

const builderConfig = (
  process.env.POLY_BUILDER_KEY &&
  process.env.POLY_BUILDER_SECRET &&
  process.env.POLY_BUILDER_PASSPHRASE
) ? new BuilderConfig({
  localBuilderCreds: {
    key:        process.env.POLY_BUILDER_KEY,
    secret:     process.env.POLY_BUILDER_SECRET,
    passphrase: process.env.POLY_BUILDER_PASSPHRASE,
  },
}) : undefined;

export async function POST(req: NextRequest) {
  const { signedOrder, orderType, apiCreds } = await req.json();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = new ClobClient(
    MAINNET.clobApi,
    MAINNET.chainId,
    undefined,   // no wallet signer needed for postOrder
    apiCreds,
    0,           // signatureType EOA
    undefined,
    undefined,
    true,        // useServerTime
    builderConfig as any, // eslint-disable-line @typescript-eslint/no-explicit-any
  );

  const result = await client.postOrder(signedOrder, orderType ?? OrderType.GTC);
  return NextResponse.json(result);
}
