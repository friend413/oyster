import React from "react";
import { useTokenName } from "./../../hooks";
import { calculateBorrowAPY, calculateDepositAPY, calculateUtilizationRatio, LendingReserve } from "../../models/lending";
import { TokenIcon } from "../../components/TokenIcon";
import { formatNumber, formatPct, fromLamports, wadToLamports } from "../../utils/utils";
import { Card, Typography } from "antd";
import { ParsedAccount, useMint } from "../../contexts/accounts";
import { Link } from "react-router-dom";
import { LABELS } from "../../constants";

const { Text } = Typography;

export enum SideReserveOverviewMode {
  Deposit = "deposit",
  Borrow = "borrow",
}

export const SideReserveOverview = (props: {
  className?: string;
  reserve: ParsedAccount<LendingReserve>;
  mode: SideReserveOverviewMode;
}) => {
  const reserve = props.reserve.info;
  const mode = props.mode;
  const name = useTokenName(reserve?.liquidityMint);
  const liquidityMint = useMint(reserve.liquidityMint);

  const availableLiquidity = fromLamports(
    reserve.availableLiquidity.toNumber(),
    liquidityMint
  );

  const depositApy = calculateDepositAPY(reserve);
  const borrowApr = calculateBorrowAPY(reserve);

  const utilizationRate = calculateUtilizationRatio(reserve);
  const liquidiationThreshold = reserve.config.optimalUtilizationRate / 100;
  const liquidiationPenalty = reserve.config.liquidationBonus / 100;
  const maxLTV = liquidiationThreshold - liquidiationPenalty;

  let extraInfo: JSX.Element | null = null;
  if (mode === SideReserveOverviewMode.Deposit) {
    extraInfo = (
      <>
        <div className="card-row">
          <Text type="secondary" className="card-cell ">
            {LABELS.TABLE_TITLE_DEPOSIT_APY}:
          </Text>
          <div className="card-cell ">{formatPct.format(depositApy)}</div>
        </div>

        <div className="card-row">
          <Text type="secondary" className="card-cell ">
            Maxiumum LTV:
          </Text>
          <div className="card-cell ">{formatPct.format(maxLTV)}</div>
        </div>

        <div className="card-row">
          <Text type="secondary" className="card-cell ">
            Liquidation threashold:
          </Text>
          <div className="card-cell ">
            {formatPct.format(liquidiationThreshold)}
          </div>
        </div>

        <div className="card-row">
          <Text type="secondary" className="card-cell ">
            Liquidation penalty:
          </Text>
          <div className="card-cell ">
            {formatPct.format(liquidiationPenalty)}
          </div>
        </div>
      </>
    );
  } else if (mode === SideReserveOverviewMode.Borrow) {
    extraInfo = (
      <>
        <div className="card-row">
          <Text type="secondary" className="card-cell ">
            {LABELS.TABLE_TITLE_BORROW_APY}:
          </Text>
          <div className="card-cell ">{formatPct.format(borrowApr)}</div>
        </div>
      </>
    );
  }

  return (
    <Card
      className={props.className}
      title={
        <div
          style={{
            display: "flex",
            alignItems: "center",
            fontSize: "1.2rem",
            justifyContent: "center",
          }}
        >
          <Link to={`/reserve/${props.reserve.pubkey}`}>
            <TokenIcon
              mintAddress={reserve?.liquidityMint}
              style={{ width: 30, height: 30 }}
            />{" "}
            {name} Reserve Overview
          </Link>
        </div>
      }
    >
      <div className="card-row">
        <Text type="secondary" className="card-cell ">
          Utilization rate:
        </Text>
        <div className="card-cell ">{formatPct.format(utilizationRate)}</div>
      </div>

      <div className="card-row">
        <Text type="secondary" className="card-cell ">
          Available liquidity:
        </Text>
        <div className="card-cell ">
          {formatNumber.format(availableLiquidity)} {name}
        </div>
      </div>

      {extraInfo}
    </Card>
  );
};
