import React from 'react';
import { GithubOutlined, TwitterOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { SecurityAuditButton } from '../SecurityAuditButton';
import { Button } from 'antd';

import './index.less';

export const Footer = () => {
  return (
    <div className={'footer'}>
      <SecurityAuditButton />
      <Button
        shape={'circle'}
        target={'_blank'}
        href={'https://github.com/solana-labs/oyster'}
        icon={<GithubOutlined />}
        style={{ marginRight: '20px' }}
      ></Button>
      <Button
        shape={'circle'}
        target={'_blank'}
        href={'https://twitter.com/solana'}
        icon={<TwitterOutlined />}
      ></Button>
    </div>
  );
};
