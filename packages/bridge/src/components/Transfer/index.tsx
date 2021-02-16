import React, { useCallback } from 'react';
import { Button, Card } from 'antd';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { LABELS } from '../../constants';
import { contexts, utils, ConnectButton } from '@oyster/common';
import { useHistory, useLocation } from "react-router-dom";
import { SolanaInput, EthereumInput } from "./../Input";

import './style.less';

const { useConnection } = contexts.Connection;
const { useWallet } = contexts.Wallet;
const { notify } = utils;

export const Transfer = () => {
  const connection = useConnection();
  const { wallet } = useWallet();


  return (
    <>
    <div className="exchange-card">
      <EthereumInput
          title="From Ethereum"
          onInputChange={() => {}}
          />
      <Button type="primary" className="swap-button">
        ⇅
      </Button>
      <SolanaInput
          title="To Solana"
          onInputChange={() => {}}
          />
    </div>
    <ConnectButton type="primary">
      Transfer
    </ConnectButton>
  </>
  );
};
