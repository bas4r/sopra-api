import { ethers, Contract, ContractInterface, BigNumberish, utils, PopulatedTransaction } from 'ethers'
import GnosisSafeSol from '@gnosis.pm/safe-contracts/build/artifacts/contracts/GnosisSafe.sol/GnosisSafe.json'
import ProxyFactorySol from '@gnosis.pm/safe-contracts/build/artifacts/contracts/proxies/GnosisSafeProxyFactory.sol/GnosisSafeProxyFactory.json'
import {
  InitializerAction,
  EIP712_SAFE_TX_TYPE,
  GnosisMultisigCreateOptions,
  EthereumGnosisMultisigTransactionOptions,
  GnosisSafeSignature,
  GnosisSafeTransaction,
  GnosisSafeRawTransaction,
  EthereumTransactionAction,
  EthereumRawTransactionAction
} from './models'
import {
  DEFAULT_GAS_TOKEN,
  DEFAULT_REFUND_RECIEVER,
  DEFAULT_TX_BASE_GAS,
  DEFAULT_TX_GAS_PRICE,
  DEFAULT_TX_SAFE_GAS,
  EMPTY_DATA,
  EMPTY_HEX,
  EMPTY_TX_OPERATION,
  EMPTY_TX_VALUE,
  SENTINEL_ADDRESS,
  ZERO_ADDRESS,
  ZERO_HEX
} from './constants'
import { bufferToHexString, isAString, isNullOrEmpty, nullifyIfEmpty, removeEmptyValuesInJsonObject, toBuffer, toEthereumTxData, tryParseJSON } from '../helpers'

/** Checks if nullOrEmpty and ethereum spesific hexadecimal and Buffer values that implies empty */
export function isNullOrEmptyEthereumValue(obj: any) {
  if (isNullOrEmpty(obj) || obj === 0 || obj === ZERO_HEX || obj === EMPTY_HEX || obj === ZERO_ADDRESS || obj === Buffer.from(ZERO_HEX, 'hex') || obj === 'NaN') {
    return true
  }
    try {
    if (Buffer.isBuffer(obj) && bufferToHexString(obj) === EMPTY_HEX) return true
  } catch (error) {
    // noting to do
  }
  return false
}

// TODO: move to a more generic directory (Consider using EthersJs)
export function getEthersJsonRpcProvider(url: string) {
  return new ethers.providers.JsonRpcProvider(url)
}
// TODO: move to a more generic directory
export function getEthersWallet(privateKey: string, provider?: ethers.providers.Provider) {
  return new ethers.Wallet(privateKey, provider)
}

export function isValidGnosisSignature(value: GnosisSafeSignature) {
  let signature: GnosisSafeSignature
  // this is an oversimplified check just to prevent assigning a wrong string
  if (!value) return false
  if (typeof value === 'string') {
    signature = tryParseJSON(value) || {}
  } else {
    signature = value
  }
  const { signer, data } = signature
  return !!signer && !!data
}

/** Convert certain bytes of signature data for Gnosis
 * This helper function can be used multiple times to ensure the signature is in right format
 */
export function signedMessageHashToGnosisSignatureData(signatureHash: string) {
  return signatureHash.replace(/1b$/, '1f').replace(/1c$/, '20')
}

/** Accepts GnosisSafeSignature or stringified version of it
 *  Returns GnosisSafeSignature
 */
export function toGnosisSignature(value: string | GnosisSafeSignature): GnosisSafeSignature {
  const signature = (typeof value === 'string' ? tryParseJSON(value) : value) as GnosisSafeSignature
  signature.data = signedMessageHashToGnosisSignatureData(signature.data)

  if (isValidGnosisSignature(signature)) {
    return signature
  }
  throw new Error(`Not a valid ethereum signature:${JSON.stringify(value)}.`)
}

/** stringify a Gnosis sig object */
export function toStringifiedstringFromGnosisSignature(gnosisSignature: GnosisSafeSignature | string): string {
  if (isAString(gnosisSignature)) return gnosisSignature as string
  return JSON.stringify(gnosisSignature) as string
}

/** stringify an array of Gnosis sig objects */
export function toStringifiedstringFromGnosisSignatures(gnosisSignatures: GnosisSafeSignature[]) {
  return (gnosisSignatures || []).map((gs) => toStringifiedstringFromGnosisSignature(gs))
}

/** Returns GnosisSafe (for singleton master or proxy) contract instance, that is gonna be used for
 * generating action hashes that is going to be executed by multisigAccount wether is
 * creating account, or executing transactions
 */
export function getGnosisSafeContract(provider: ethers.providers.Provider, address: string): Contract {
  return new Contract(address, GnosisSafeSol.abi as ContractInterface, provider)
}

/** Returns the contract instance, allows for creating new multisig accounts */
export function getProxyFactoryEthersContract(provider: ethers.providers.Provider, address: string): Contract {
  return new Contract(address, ProxyFactorySol.abi as ContractInterface, provider)
}

export function setupInitilaizerAction(initializerAction?: InitializerAction) {
  const { initializerTo, initializerData, paymentToken, paymentAmount, paymentReceiver } = initializerAction || {}
  return {
    initializerTo: initializerTo || SENTINEL_ADDRESS,
    initializerData: initializerData || EMPTY_DATA,
    paymentToken: paymentToken || SENTINEL_ADDRESS,
    paymentAmount: paymentAmount || 0,
    paymentReceiver: paymentReceiver || SENTINEL_ADDRESS
  }
}

export function sortHexStrings(hexArray: string[]) {
  hexArray?.sort((left, right) => left?.toLowerCase().localeCompare(right?.toLowerCase()))
  return hexArray
}

export async function getCreateProxyInitializerData(multisigOptions: GnosisMultisigCreateOptions, chainUrl: string) {
  const { gnosisSafeMaster, fallbackHandler, initializerAction, threshold, owners } = multisigOptions
  const ethersProvier = getEthersJsonRpcProvider(chainUrl)
  const gnosisSafeMasterContract = getGnosisSafeContract(ethersProvier, gnosisSafeMaster)
  const { initializerTo, initializerData, paymentToken, paymentAmount, paymentReceiver } = setupInitilaizerAction(initializerAction)
  const sortedAddrs = sortHexStrings(owners)
  const { data } = await gnosisSafeMasterContract.populateTransaction.setup(sortedAddrs, threshold, initializerTo, initializerData, fallbackHandler, paymentToken, paymentAmount, paymentReceiver)
  return data
}

/** Throws if any options missing that are needed for proxy */
export function assertMultisigOptionsForProxyArePresent(multisigOptions: GnosisMultisigCreateOptions) {
  if (
    isNullOrEmpty(multisigOptions?.owners) ||
    isNullOrEmpty(multisigOptions?.threshold) ||
    isNullOrEmptyEthereumValue(multisigOptions?.gnosisSafeMaster) ||
    isNullOrEmptyEthereumValue(multisigOptions?.proxyFactory) ||
    isNullOrEmpty(multisigOptions?.saltNonce)
  ) {
    throw new Error('Missing one or more required options: (owners, threshold, gnosisSafeMaster, or proxyFactory) for proxy contract.')
  }
}

/** Simulates creating new multisigAccount deterministicly by using nonce
 *  Returns the contract address that will be assigned for multisigAccount
 */
export async function calculateProxyAddress(multisigOptions: GnosisMultisigCreateOptions, chainUrl: string) {
  assertMultisigOptionsForProxyArePresent(multisigOptions)
  const { gnosisSafeMaster, proxyFactory, saltNonce } = multisigOptions

  const ethersProvier = getEthersJsonRpcProvider(chainUrl)
  const proxyFactoryContract = getProxyFactoryEthersContract(ethersProvier, proxyFactory)
  const initializerData = await getCreateProxyInitializerData(multisigOptions, chainUrl)
  let address
  try {
    address = await proxyFactoryContract.callStatic.createProxyWithNonce(gnosisSafeMaster, initializerData, saltNonce)
  } catch (err) {
    throw new Error('Invalid create options. Account with this saltNonce may have already been created. Try increasing saltNonce')
  }
  return address
}

/** Returns transaction object including ({to, data, ...}) for creating multisig proxy contract
 */
export async function getCreateProxyTransaction(multisigOptions: GnosisMultisigCreateOptions, chainUrl: string): Promise<EthereumTransactionAction> {
  assertMultisigOptionsForProxyArePresent(multisigOptions)
  const { gnosisSafeMaster, proxyFactory, saltNonce } = multisigOptions

  const ethersProvier = getEthersJsonRpcProvider(chainUrl)
  const proxyFactoryContract = getProxyFactoryEthersContract(ethersProvier, proxyFactory)
  const initializerData = await getCreateProxyInitializerData(multisigOptions, chainUrl)
  const { to, data, value } = await proxyFactoryContract.populateTransaction.createProxyWithNonce(gnosisSafeMaster, initializerData, saltNonce)
  return { to: to, data: toEthereumTxData(data as string), value: value ? value.toString() : 0 }
}

export function calculateSafeTransactionHash(safe: Contract, safeTx: GnosisSafeTransaction, chainId: BigNumberish): string {
  return utils._TypedDataEncoder.hash({ verifyingContract: safe.address, chainId }, EIP712_SAFE_TX_TYPE, safeTx)
}

export async function getSafeNonce(multisigAddress: string, chainUrl: string) {
  const ethersProvier = getEthersJsonRpcProvider(chainUrl)
  const multisigContract = getGnosisSafeContract(ethersProvier, multisigAddress)
  return multisigContract.nonce()
}


export async function transactionToSafeTx(transactionAction: EthereumTransactionAction, transactionOptions?: EthereumGnosisMultisigTransactionOptions): Promise<GnosisSafeTransaction> {
  const { to, value, data } = transactionAction
  const { operation, refundReceiver, safeTxGas, baseGas, gasPrice: safeGasPice, gasToken, nonce } = transactionOptions || {}

  return {
    to: to as string,
    value: value || EMPTY_TX_VALUE,
    data: data || EMPTY_DATA,
    operation: operation || EMPTY_TX_OPERATION,
    safeTxGas: safeTxGas || DEFAULT_TX_SAFE_GAS,
    baseGas: baseGas || DEFAULT_TX_BASE_GAS,
    gasPrice: safeGasPice || DEFAULT_TX_GAS_PRICE,
    gasToken: gasToken || DEFAULT_GAS_TOKEN,
    refundReceiver: refundReceiver || DEFAULT_REFUND_RECIEVER,
    nonce: nonce as string | number
  }
}

export async function getSafeTransactionHash(multisigAddress: string, safeTx: GnosisSafeTransaction, chainUrl: string): Promise<string> {
  const ethersProvier = getEthersJsonRpcProvider(chainUrl)
  const multisigContract = getGnosisSafeContract(ethersProvier, multisigAddress)
  const nonce = safeTx?.nonce || (await multisigContract.nonce())
  const hash = await multisigContract.getTransactionHash(
    safeTx.to,
    safeTx.value,
    safeTx.data,
    safeTx.operation,
    safeTx.safeTxGas,
    safeTx.baseGas,
    safeTx.gasPrice,
    safeTx.gasToken,
    safeTx.refundReceiver,
    nonce
  )
  return hash
}

export async function signSafeTransactionHash(privateKey: string, hash: string): Promise<GnosisSafeSignature> {
  const signerWallet = getEthersWallet(privateKey)
  const typedDataHash = utils.arrayify(hash)
  const data = signedMessageHashToGnosisSignatureData(await signerWallet.signMessage(typedDataHash))
  const placeholderSig = {
    signer: signerWallet.address,
    data
  }
  return toGnosisSignature(JSON.stringify(placeholderSig))
}

/** Generates GnosisSafe signature object, that is gonne be passed in as serialized for executeTransaction  */
export async function signSafeTransaction(privateKey: string, multisigAddress: string, safeTx: GnosisSafeTransaction, chainUrl: string): Promise<GnosisSafeSignature> {
  const trxHash = await getSafeTransactionHash(multisigAddress, safeTx, chainUrl)
  return signSafeTransactionHash(privateKey, trxHash)
}

/** Sends approveHash call for gnosis and returns signature placeholder that indicates approval */
export async function approveSafeTransaction(privateKey: string, multisigAddress: string, safeTx: GnosisSafeTransaction, chainUrl: string): Promise<GnosisSafeSignature> {
  const ethersProvier = getEthersJsonRpcProvider(chainUrl)
  const multisigContract = getGnosisSafeContract(ethersProvier, multisigAddress)
  const { chainId } = await ethersProvier.getNetwork()

  const signerWallet = getEthersWallet(privateKey)
  const trxHash = calculateSafeTransactionHash(multisigContract, safeTx, chainId)
  const typedDataHash = utils.arrayify(trxHash)

  const signerSafe = multisigContract.connect(signerWallet)
  await signerSafe.approveHash(typedDataHash)

  // The following is a placeholder 'signature' that can be added to the signatures array - this is sent to the gnosis contract when executing the transaction
  const placeholderSig = {
    signer: signerWallet.address,
    data: `0x000000000000000000000000${signerWallet.address.slice(2)}000000000000000000000000000000000000000000000000000000000000000001`
  }
  return toGnosisSignature(JSON.stringify(placeholderSig))
}

/** Sorts the signatures in right order and serializes */
export function buildSignatureBytes(signatures: GnosisSafeSignature[]): string {
  signatures?.sort((left, right) => left.signer.toLowerCase().localeCompare(right.signer.toLowerCase()))
  let signatureBytes = '0x'
  signatures?.forEach((sig) => {
    signatureBytes += sig.data.slice(2)
  })
  return signatureBytes
}

export function populatedToRawEthereumTransaction(populatedTrx: PopulatedTransaction): EthereumRawTransactionAction {
  const { from, to, value, data, gasPrice, gasLimit, nonce } = populatedTrx

  const valueHex = ethers.BigNumber.isBigNumber(value) ? (value as ethers.BigNumber).toHexString() : value
  const gasPriceHex = ethers.BigNumber.isBigNumber(gasPrice) ? (gasPrice as ethers.BigNumber).toHexString() : gasPrice
  const gasLimitHex = ethers.BigNumber.isBigNumber(gasLimit) ? (gasLimit as ethers.BigNumber).toHexString() : gasLimit

  const transactionObject = {
    from: nullifyIfEmpty(toBuffer(from)),
    to: nullifyIfEmpty(toBuffer(to)),
    value: nullifyIfEmpty(toBuffer(valueHex)),
    data: nullifyIfEmpty(toBuffer(data)),
    gasPrice: nullifyIfEmpty(toBuffer(gasPriceHex)),
    gasLimit: nullifyIfEmpty(toBuffer(gasLimitHex)),
    nonce: nullifyIfEmpty(toBuffer(nonce))
  }
  removeEmptyValuesInJsonObject(transactionObject)
  return transactionObject
}

export async function getSafeExecuteTransaction(
  multisigAddress: string,
  safeTx: GnosisSafeTransaction,
  chainUrl: string,
  signatures: GnosisSafeSignature[],
  overrides?: any
): Promise<any> {
  const ethersProvier = getEthersJsonRpcProvider(chainUrl)
  const multisigContract = getGnosisSafeContract(ethersProvier, multisigAddress)
  const signatureBytes = buildSignatureBytes(signatures)
  const populatedTrx = await multisigContract.populateTransaction.execTransaction(
    safeTx.to,
    safeTx.value,
    safeTx.data,
    safeTx.operation,
    safeTx.safeTxGas,
    safeTx.baseGas,
    safeTx.gasPrice,
    safeTx.gasToken,
    safeTx.refundReceiver,
    signatureBytes,
    overrides || {}
  )
  return populatedTrx
}

export async function executeSafeTransaction(safe: Contract, safeTx: GnosisSafeTransaction, signatures: GnosisSafeSignature[], overrides?: any): Promise<any> {
  const signatureBytes = buildSignatureBytes(signatures)
  return safe.execTransaction(
    safeTx.to,
    safeTx.value,
    safeTx.data,
    safeTx.operation,
    safeTx.safeTxGas,
    safeTx.baseGas,
    safeTx.gasPrice,
    safeTx.gasToken,
    safeTx.refundReceiver,
    signatureBytes,
    overrides || {}
  )
}

export function containsSafeSpecificField(value: any | GnosisSafeRawTransaction): value is GnosisSafeRawTransaction {
  const { operation, refundReceiver, safeTxGas, baseGas, gasToken, signatures } = (value as GnosisSafeRawTransaction) || {}
  if (operation !== undefined || refundReceiver !== undefined || safeTxGas !== undefined || baseGas !== undefined || gasToken !== undefined || signatures !== undefined) {
    return true
  }
  return false
}

export async function signTransaction(transaction: EthereumTransactionAction, privateKey: string, url: string) {
  const provider = getEthersJsonRpcProvider(url)
  const signerWallet = getEthersWallet(privateKey, provider)
  const trxToSign = {
    gasLimit: 300000,
    ...transaction,
    nonce: isNullOrEmpty(transaction.nonce) ? (await provider.getTransactionCount(signerWallet.address, 'pending')) : transaction.nonce,
    gasPrice: isNullOrEmpty(transaction.gasPrice) ? (await provider.getGasPrice()) : transaction.gasPrice
  }
  signerWallet.checkTransaction(trxToSign)
  const signedHash = await signerWallet.signTransaction(trxToSign)
  return signedHash
}

export async function sendTransaction(signedHash: string, url: string) {
  const provider = getEthersJsonRpcProvider(url)
  const result = await provider.sendTransaction(signedHash)
  return result
}
