import React, { useCallback, useMemo, useState } from "react";
import { InputType, useAccountByMint, useSliderInput, useTokenName, useUserBalance } from "../../hooks";
import {
  LendingObligation,
  LendingReserve,
  LendingReserveParser,
} from "../../models";
import { TokenIcon } from "../TokenIcon";
import { Button, Card, Slider, Spin } from "antd";
import { cache, ParsedAccount, useMint } from "../../contexts/accounts";
import { NumericInput } from "../Input/numeric";
import { useConnection } from "../../contexts/connection";
import { useWallet } from "../../contexts/wallet";
import { repay } from "../../actions";
import { CollateralSelector } from "./../CollateralSelector";
import "./style.less";
import { LABELS, marks } from "../../constants";
import { LoadingOutlined } from "@ant-design/icons";
import { ActionConfirmation } from "./../ActionConfirmation";

const antIcon = <LoadingOutlined style={{ fontSize: 24 }} spin />;

export const RepayInput = (props: {
  className?: string;
  reserve: ParsedAccount<LendingReserve>;
  obligation?: ParsedAccount<LendingObligation>;
}) => {
  const connection = useConnection();
  const { wallet } = useWallet();
  const [pendingTx, setPendingTx] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const repayReserve = props.reserve;
  const obligation = props.obligation;

  const [collateralReserveMint, setCollateralReserveMint] = useState<string>();

  const collateralReserve = useMemo(() => {
    const id: string =
      cache
        .byParser(LendingReserveParser)
        .find((acc) => acc === collateralReserveMint) || "";

    return cache.get(id) as ParsedAccount<LendingReserve>;
  }, [collateralReserveMint]);

  const name = useTokenName(repayReserve?.info.liquidityMint);
  const { accounts: fromAccounts, balance, balanceLamports } = useUserBalance(
    repayReserve.info.liquidityMint
  );

  const repayLiquidityMint = useMint(repayReserve.info.liquidityMint);
  // const collateralBalance = useUserBalance(reserve?.collateralMint);

  const obligationAccount = useAccountByMint(obligation?.info.tokenMint);

  const convert = useCallback(
    (val: string | number) => {
      if (typeof val === "string") {
        return (parseFloat(val) / balance) * 100;
      } else {
        return ((val * balance) / 100).toFixed(2);
      }
    },
    [balance]
  );

  const { value, setValue, mark, setMark, type } = useSliderInput(convert);

  const onRepay = useCallback(() => {
    if (
      !collateralReserve ||
      !obligation ||
      !repayReserve ||
      !obligationAccount
    ) {
      return;
    }

    setPendingTx(true);

    (async () => {
      try {
        await repay(
          fromAccounts[0],
          type === InputType.Slider
          ? (mark * balanceLamports) / 100
          : Math.ceil(balanceLamports * (parseFloat(value) / balance)),
          obligation,
          obligationAccount,
          repayReserve,
          collateralReserve,
          connection,
          wallet
        );

        setValue("");
        setShowConfirmation(true);
      } catch {
        // TODO:
      } finally {
        setPendingTx(false);
      }
    })();
  }, [
    mark,
    value,
    balance,
    balanceLamports,
    type,
    connection,
    wallet,
    obligation,
    collateralReserve,
    repayReserve,
    fromAccounts,
    obligationAccount,
  ]);

  const bodyStyle: React.CSSProperties = {
    display: "flex",
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    height: "100%",
  };

  return (
    <Card className={props.className} bodyStyle={bodyStyle}>
      {showConfirmation ? (
        <ActionConfirmation onClose={() => setShowConfirmation(false)} />
      ) : (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-around",
          }}
        >
          <div className="repay-input-title">
            {LABELS.REPAY_QUESTION}
          </div>
          <div className="token-input">
            <TokenIcon mintAddress={repayReserve?.info.liquidityMint} />
            <NumericInput
              value={value}
              onChange={setValue}
              autoFocus={true}
              style={{
                fontSize: 20,
                boxShadow: "none",
                borderColor: "transparent",
                outline: "transparent",
              }}
              placeholder="0.00"
            />
            <div>{name}</div>
          </div>
          <Slider
              marks={marks}
              value={mark}
              onChange={setMark}
            />
          <div className="repay-input-title">{LABELS.SELECT_COLLATERAL}</div>
          <CollateralSelector
            reserve={repayReserve.info}
            mint={collateralReserveMint}
            onMintChange={setCollateralReserveMint}
          />

          <Button
            type="primary"
            onClick={onRepay}
            disabled={fromAccounts.length === 0}
          >
            {LABELS.REPAY_ACTION}
            {pendingTx && (
              <Spin indicator={antIcon} className="action-spinner" />
            )}
          </Button>
        </div>
      )}
    </Card>
  );
};
