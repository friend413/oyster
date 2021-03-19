import {
  PublicKey,
  SYSVAR_CLOCK_PUBKEY,
  TransactionInstruction,
} from '@solana/web3.js';
import { utils } from '@oyster/common';
import * as Layout from '../utils/layout';

import * as BufferLayout from 'buffer-layout';
import { TimelockInstruction } from './timelock';
import BN from 'bn.js';

/// [Requires Voting tokens]
/// Burns voting tokens, indicating you approve and/or disapprove of running this set of transactions. If you tip the consensus,
/// then the transactions can begin to be run at their time slots when people click execute.
///
///   0. `[writable]` Timelock set account.
///   1. `[writable]` Your Voting account.
///   2. `[writable]` Your Yes-Voting account.
///   3. `[writable]` Your No-Voting account.
///   4. `[writable]` Voting mint account.
///   5. `[writable]` Yes Voting mint account.
///   6. `[writable]` No Voting mint account.
///   7. `[]` Governance mint account
///   8. `[]` Timelock config account.
///   9. `[]` Transfer authority
///   10. `[]` Timelock program mint authority
///   11. `[]` Timelock program account pub key.
///   12. `[]` Token program account.
///   13. `[]` Clock sysvar.
export const voteInstruction = (
  timelockSetAccount: PublicKey,
  votingAccount: PublicKey,
  yesVotingAccount: PublicKey,
  noVotingAccount: PublicKey,
  votingMint: PublicKey,
  yesVotingMint: PublicKey,
  noVotingMint: PublicKey,
  governanceMint: PublicKey,
  timelockConfig: PublicKey,
  transferAuthority: PublicKey,
  mintAuthority: PublicKey,
  yesVotingTokenAmount: number,
  noVotingTokenAmount: number,
): TransactionInstruction => {
  const PROGRAM_IDS = utils.programIds();

  const dataLayout = BufferLayout.struct([
    BufferLayout.u8('instruction'),
    Layout.uint64('yesVotingTokenAmount'),
    Layout.uint64('noVotingTokenAmount'),
  ]);

  const data = Buffer.alloc(dataLayout.span);

  dataLayout.encode(
    {
      instruction: TimelockInstruction.Vote,
      yesVotingTokenAmount: new BN(yesVotingTokenAmount),
      noVotingTokenAmount: new BN(noVotingTokenAmount),
    },
    data,
  );

  const keys = [
    { pubkey: timelockSetAccount, isSigner: false, isWritable: true },
    { pubkey: votingAccount, isSigner: false, isWritable: true },
    { pubkey: yesVotingAccount, isSigner: false, isWritable: true },
    { pubkey: noVotingAccount, isSigner: false, isWritable: true },
    { pubkey: votingMint, isSigner: false, isWritable: true },
    { pubkey: yesVotingMint, isSigner: false, isWritable: true },
    { pubkey: noVotingMint, isSigner: false, isWritable: true },
    { pubkey: governanceMint, isSigner: false, isWritable: false },
    { pubkey: timelockConfig, isSigner: false, isWritable: false },
    { pubkey: transferAuthority, isSigner: true, isWritable: false },
    { pubkey: mintAuthority, isSigner: false, isWritable: false },
    {
      pubkey: PROGRAM_IDS.timelock.programAccountId,
      isSigner: false,
      isWritable: false,
    },
    { pubkey: PROGRAM_IDS.token, isSigner: false, isWritable: false },
    { pubkey: SYSVAR_CLOCK_PUBKEY, isSigner: false, isWritable: false },
  ];

  return new TransactionInstruction({
    keys,
    programId: PROGRAM_IDS.timelock.programId,
    data,
  });
};
