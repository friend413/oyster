import { Card, Col, Row, Spin, Statistic, Tabs } from 'antd';
import React, { useMemo, useState } from 'react';
import { LABELS } from '../../constants';
import { ParsedAccount, TokenIcon, constants } from '@oyster/common';
import { BigNumber } from 'bignumber.js';

import ReactMarkdown from 'react-markdown';

import { StateBadge } from './components/StateBadge';
import { contexts } from '@oyster/common';
import { MintInfo } from '@solana/spl-token';
import { InstructionCard } from './components/InstructionCard';
import { NewInstructionCard } from './components/NewInstructionCard';
import SignOffButton from './components/SignOffButton';

import { CastVote } from './components/CastVote';
import { RelinquishVote } from './components/RelinquishVote';
import './style.less';

import { VoterBubbleGraph } from './components/VoterBubbleGraph';
import { VoterTable } from './components/VoterTable';
import {
  Governance,
  Proposal,
  ProposalState,
  TokenOwnerRecord,
  VoteRecord,
} from '../../models/accounts';
import { useKeyParam } from '../../hooks/useKeyParam';
import { Vote } from '../../models/instructions';
import CancelButton from './components/CancelButton';
import { FinalizeVote } from './components/FinalizeVote';

import {
  useGovernance,
  useProposal,
  useTokenOwnerRecords,
  useWalletTokenOwnerRecord,
  useWalletSignatoryRecord,
  useInstructionsByProposal,
  useVoteRecordsByProposal,
} from '../../hooks/apiHooks';
import BN from 'bn.js';

const { TabPane } = Tabs;
const { ZERO } = constants;

export const urlRegex =
  // eslint-disable-next-line
  /[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/;
const { useMint } = contexts.Accounts;
const { useConnectionConfig } = contexts.Connection;

export enum VoteType {
  Undecided = 'Undecided',
  Yes = 'Yay',
  No = 'Nay',
}

export const ProposalView = () => {
  const { endpoint } = useConnectionConfig();

  let proposalKey = useKeyParam();
  let proposal = useProposal(proposalKey);

  let governance = useGovernance(proposal?.info.governance);

  const governingTokenMint = useMint(proposal?.info.governingTokenMint);

  const voteRecords = useVoteRecordsByProposal(proposal?.pubkey);
  const tokenOwnerRecords = useTokenOwnerRecords(
    governance?.info.config.realm,
    proposal?.info.governingTokenMint,
  );

  return (
    <>
      <div className="flexColumn">
        {proposal && governance && governingTokenMint ? (
          <InnerProposalView
            proposal={proposal}
            governance={governance}
            voterDisplayData={mapVoterDisplayData(
              voteRecords,
              tokenOwnerRecords,
            )}
            governingTokenMint={governingTokenMint}
            endpoint={endpoint}
            hasVotes={voteRecords.length > 0}
          />
        ) : (
          <Spin />
        )}
      </div>
    </>
  );
};

function useLoadGist({
  loading,
  setLoading,
  setFailed,
  setMsg,
  setContent,
  isGist,
  proposalState: proposal,
}: {
  loading: boolean;
  setLoading: (b: boolean) => void;
  setMsg: (b: string) => void;
  setFailed: (b: boolean) => void;
  setContent: (b: string) => void;
  isGist: boolean;
  proposalState: ParsedAccount<Proposal>;
}) {
  useMemo(() => {
    if (loading) {
      let toFetch = proposal.info.descriptionLink;
      const pieces = toFetch.match(urlRegex);
      if (isGist && pieces) {
        const justIdWithoutUser = pieces[1].split('/')[2];
        toFetch = 'https://api.github.com/gists/' + justIdWithoutUser;
      }
      fetch(toFetch)
        .then(async resp => {
          if (resp.status === 200) {
            if (isGist) {
              const jsonContent = await resp.json();
              const nextUrlFileName = Object.keys(jsonContent['files'])[0];
              const nextUrl = jsonContent['files'][nextUrlFileName]['raw_url'];
              fetch(nextUrl).then(async response =>
                setContent(await response.text()),
              );
            } else setContent(await resp.text());
          } else {
            if (resp.status === 403 && isGist)
              setMsg(LABELS.GIT_CONTENT_EXCEEDED);
            setFailed(true);
          }
          setLoading(false);
        })
        .catch(_ => {
          setFailed(true);
          setLoading(false);
        });
    }
  }, [loading]); //eslint-disable-line
}

export interface VoterDisplayData {
  name: string;
  title: string;
  group: string;
  value: BN;
}

function mapVoterDisplayData(
  voteRecords: ParsedAccount<VoteRecord>[],
  tokenOwnerRecords: ParsedAccount<TokenOwnerRecord>[],
): Array<VoterDisplayData> {
  const mapper = (key: string, amount: BN, label: string) => ({
    name: key,
    title: key,
    group: label,
    value: amount,
    key: key,
  });

  const undecidedData = [
    ...tokenOwnerRecords
      .filter(
        tor =>
          !tor.info.governingTokenDepositAmount.isZero() &&
          !voteRecords.some(
            vt =>
              vt.info.governingTokenOwner.toBase58() ===
              tor.info.governingTokenOwner.toBase58(),
          ),
      )
      .map(tor =>
        mapper(
          tor.info.governingTokenOwner.toBase58(),
          tor.info.governingTokenDepositAmount,
          VoteType.Undecided,
        ),
      ),
  ];

  const noVoteData = [
    ...voteRecords
      .filter(vr => vr.info.voteWeight.no?.gt(ZERO))
      .map(vr =>
        mapper(
          vr.info.governingTokenOwner.toBase58(),
          vr.info.voteWeight.no,
          VoteType.No,
        ),
      ),
  ];

  const yesVoteData = [
    ...voteRecords
      .filter(vr => vr.info.voteWeight.yes?.gt(ZERO))
      .map(vr =>
        mapper(
          vr.info.governingTokenOwner.toBase58(),
          vr.info.voteWeight.yes,
          VoteType.Yes,
        ),
      ),
  ];

  const data = [...undecidedData, ...yesVoteData, ...noVoteData].sort((a, b) =>
    b.value.cmp(a.value),
  );

  return data;
}

function InnerProposalView({
  proposal,
  governingTokenMint,
  governance,
  voterDisplayData,
  endpoint,
  hasVotes,
}: {
  proposal: ParsedAccount<Proposal>;
  governance: ParsedAccount<Governance>;
  governingTokenMint: MintInfo;
  voterDisplayData: Array<VoterDisplayData>;
  endpoint: string;
  hasVotes: boolean;
}) {
  let signatoryRecord = useWalletSignatoryRecord(proposal.pubkey);
  const tokenOwnerRecord = useWalletTokenOwnerRecord(
    governance.info.config.realm,
    proposal.info.governingTokenMint,
  );
  const instructions = useInstructionsByProposal(proposal.pubkey);

  const isUrl = !!proposal.info.descriptionLink.match(urlRegex);
  const isGist =
    !!proposal.info.descriptionLink.match(/gist/i) &&
    !!proposal.info.descriptionLink.match(/github/i);
  const [content, setContent] = useState(proposal.info.descriptionLink);
  const [loading, setLoading] = useState(isUrl);
  const [failed, setFailed] = useState(false);
  const [msg, setMsg] = useState('');
  const [width, setWidth] = useState<number>();
  const [height, setHeight] = useState<number>();
  //  const breakpoint = useBreakpoint();

  useLoadGist({
    loading,
    setLoading,
    setFailed,
    setMsg,
    setContent,
    isGist,
    proposalState: proposal,
  });

  return (
    <Row>
      <Col flex="auto" xxl={15} xs={24} className="proposal-container">
        <Row justify="center" align="middle" className="proposal-header">
          <Col md={12} xs={24}>
            <Row>
              <TokenIcon
                mintAddress={proposal?.info.governingTokenMint.toBase58()}
                size={60}
              />
              <Col>
                <h1>{proposal.info.name}</h1>
                <StateBadge state={proposal.info.state} />
              </Col>
            </Row>
          </Col>
          <Col md={12} xs={24}>
            <div className="proposal-actions">
              <CancelButton proposal={proposal}></CancelButton>

              {signatoryRecord &&
                (proposal.info.state === ProposalState.Draft ||
                  proposal.info.state === ProposalState.SigningOff) && (
                  <SignOffButton signatoryRecord={signatoryRecord} />
                )}
              <FinalizeVote
                proposal={proposal}
                governance={governance}
              ></FinalizeVote>

              {tokenOwnerRecord && (
                <>
                  <RelinquishVote
                    proposal={proposal}
                    tokenOwnerRecord={tokenOwnerRecord}
                  />
                  <CastVote
                    governance={governance}
                    proposal={proposal}
                    tokenOwnerRecord={tokenOwnerRecord}
                    vote={Vote.Yes}
                  />
                  <CastVote
                    governance={governance}
                    proposal={proposal}
                    vote={Vote.No}
                    tokenOwnerRecord={tokenOwnerRecord}
                  />
                </>
              )}
            </div>
          </Col>
        </Row>

        {hasVotes && (
          <Row
            gutter={[
              { xs: 8, sm: 16, md: 24, lg: 32 },
              { xs: 8, sm: 16, md: 24, lg: 32 },
            ]}
            className="proposals-visual"
          >
            <Col md={12} sm={24} xs={24}>
              <Card
                style={{ height: '100%' }}
                title={LABELS.LARGEST_VOTERS_BUBBLE}
              >
                {width && height && (
                  <VoterBubbleGraph
                    endpoint={endpoint}
                    width={width}
                    height={height}
                    data={voterDisplayData}
                  />
                )}
              </Card>
            </Col>
            <Col md={12} sm={24} xs={24}>
              <Card
                style={{ height: '100%' }}
                title={LABELS.LARGEST_VOTERS_TABLE}
              >
                <div
                  ref={r => {
                    if (r) {
                      setHeight(r.clientHeight);
                      setWidth(r.clientWidth);
                    }
                  }}
                >
                  <VoterTable
                    endpoint={endpoint}
                    total={governingTokenMint.supply}
                    data={voterDisplayData}
                    decimals={governingTokenMint.decimals}
                  />
                </div>
              </Card>
            </Col>
          </Row>
        )}

        <Row className="proposals-stats">
          <Col md={7} xs={24}>
            <Card>
              <Statistic
                title={LABELS.SIGNATORIES}
                value={proposal.info.signatoriesCount}
                suffix={`/ ${proposal.info.signatoriesSignedOffCount}`}
              />
            </Card>
          </Col>
          <Col md={7} xs={24}>
            <Card>
              <Statistic
                title={LABELS.VOTE_SCORE_IN_FAVOUR}
                value={getVoteInFavorScore(proposal, governingTokenMint)}
                suffix={`/ ${getMaxVoteScore(governingTokenMint)}`}
              />
            </Card>
          </Col>
          <Col md={7} xs={24}>
            <Card>
              <Statistic
                valueStyle={{ color: 'green' }}
                title={LABELS.VOTE_SCORE_REQUIRED}
                value={getMinRequiredYesVoteScore(
                  governance,
                  governingTokenMint,
                )}
              />
            </Card>
          </Col>
        </Row>

        <Row>
          <Col span={24}>
            <Tabs
              defaultActiveKey="1"
              size="large"
              style={{ marginBottom: 32 }}
            >
              <TabPane tab="Description" key="1">
                {loading ? (
                  <Spin />
                ) : isUrl ? (
                  failed ? (
                    <p>
                      {LABELS.DESCRIPTION}:{' '}
                      <a
                        href={proposal.info.descriptionLink}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {msg ? msg : LABELS.NO_LOAD}
                      </a>
                    </p>
                  ) : (
                    <ReactMarkdown children={content} />
                  )
                ) : (
                  content
                )}
              </TabPane>
              <TabPane tab={LABELS.INSTRUCTIONS} key="2">
                <Row
                  gutter={[
                    { xs: 8, sm: 16, md: 24, lg: 32 },
                    { xs: 8, sm: 16, md: 24, lg: 32 },
                  ]}
                >
                  {instructions.map((instruction, position) => (
                    <Col xs={24} sm={24} md={12} lg={8} key={position}>
                      <InstructionCard
                        proposal={proposal}
                        position={position + 1}
                        instruction={instruction}
                      />
                    </Col>
                  ))}
                  {proposal.info.state === ProposalState.Draft && (
                    <Col xs={24} sm={24} md={12} lg={8}>
                      <NewInstructionCard
                        proposal={proposal}
                        governance={governance}
                      />
                    </Col>
                  )}
                </Row>
              </TabPane>
            </Tabs>
          </Col>
        </Row>
      </Col>
    </Row>
  );
}

function getMinRequiredYesVoteScore(
  governance: ParsedAccount<Governance>,
  governingTokenMint: MintInfo,
): string {
  const minVotes =
    governance.info.config.yesVoteThresholdPercentage === 100
      ? governingTokenMint.supply
      : governingTokenMint.supply
          .mul(new BN(governance.info.config.yesVoteThresholdPercentage))
          .div(new BN(100));

  return new BigNumber(minVotes.toString())
    .shiftedBy(-governingTokenMint.decimals)
    .toString();
}

function getVoteInFavorScore(
  proposal: ParsedAccount<Proposal>,
  governingTokenMint: MintInfo,
): string {
  return new BigNumber(proposal.info.yesVotesCount.toString())
    .shiftedBy(-governingTokenMint.decimals)
    .toString();
}

function getMaxVoteScore(governingTokenMint: MintInfo) {
  return new BigNumber(governingTokenMint.supply.toString())
    .shiftedBy(-governingTokenMint.decimals)
    .toFormat();
}
