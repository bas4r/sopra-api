import BN from 'bn.js'
import { ethers } from 'ethers'

export type EthereumActionContract = {
  abi: any
  method: string
  parameters: (any | any[])[]
}

export type EthereumTransactionAction = {
  nonce?: string
  gasPrice?: string
  gasLimit?: string
  to?: string
  from?: string
  value?: string | number
  data?: string
  contract?: EthereumActionContract
}


export type GnosisMultisigCreateOptions = {
  owners: string[]
  threshold: number
  saltNonce: number
  gnosisSafeMaster: string
  proxyFactory: string
  fallbackHandler?: string
  initializerAction?: InitializerAction
}

export type EthereumGnosisMultisigTransactionOptions = {
  multisigAddress: string
  operation?: number
  nonce?: number
  /** specifies a (non-eth) custom token used to pay gas */
  gasToken?: string
  /** Only used if gasToken is set */
  refundReceiver?: string
  /** Only used if gasToken is set */
  safeTxGas?: number | string
  /** Only used if gasToken is set */
  baseGas?: number | string
  /** Only used if gasToken is set */
  gasPrice?: number | string
}

/** Ethereum action will be called automatically as proxy multisig contract is created
 * Can be used for a similiar functionality as createWithFirstSign
 */
export type InitializerAction = {
  initializerTo?: string
  initializerData?: string
  paymentToken?: string
  paymentAmount?: number
  paymentReceiver?: string
}

export type GnosisSafeTransaction = {
  to: string
  value: string | number | BN | ethers.BigNumber
  data: string
  operation: number
  refundReceiver: string
  safeTxGas: number | string
  baseGas: number | string
  gasPrice: number | string
  gasToken: string
  nonce: number | string
}

/** Adds signatures to GnosisSafeTransaction to support setFromRaw() */
export type GnosisSafeRawTransaction = GnosisSafeTransaction & {
  signatures?: GnosisSafeSignature[]
}

/** Signature object that are gonna be serialized passed for executing sign trx */
export type GnosisSafeSignature = {
  signer: string
  data: string
}

export const EIP712_SAFE_TX_TYPE = {
  // "SafeTx(address to,uint256 value,bytes data,uint8 operation,uint256 safeTxGas,uint256 baseGas,uint256 gasPrice,address gasToken,address refundReceiver,uint256 nonce)"
  SafeTx: [
    { type: 'address', name: 'to' },
    { type: 'uint256', name: 'value' },
    { type: 'bytes', name: 'data' },
    { type: 'uint8', name: 'operation' },
    { type: 'uint256', name: 'safeTxGas' },
    { type: 'uint256', name: 'baseGas' },
    { type: 'uint256', name: 'gasPrice' },
    { type: 'address', name: 'gasToken' },
    { type: 'address', name: 'refundReceiver' },
    { type: 'uint256', name: 'nonce' },
  ],
}

/** Transaction action with raw Buffer data */
export type EthereumRawTransactionAction = {
  from?: Buffer
  nonce?: Buffer
  gasPrice?: Buffer
  gasLimit?: Buffer
  to?: Buffer
  value?: Buffer
  data?: Buffer
  v?: Buffer
  r?: Buffer
  s?: Buffer
}