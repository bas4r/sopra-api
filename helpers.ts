import { BigNumber } from 'ethers'
import BN from 'bn.js'
import { parse, stringify } from 'flatted'
// import { sha256 } from 'js-sha256'

import axios from 'axios'

export async function postRequest(url: string, args?: any, headers?: any) {
  const api = axios.create({
    timeout: 1000,
    headers: {
      'Content-type': 'application/json',
      ...headers
    }
  })
  return api.post(url, args)
}

export async function getRequest(url: string, args?: any, headers?: any) {
  const api = axios.create({
    timeout: 1000,
    headers: {
      Accept: 'application/json',
      ...headers
    }
  })
  const queryParamsString = Object.keys(args)
    .map((key) => key + '=' + args[key])
    .join('&')
  console.log('RequestURL: ', `${url}?${queryParamsString}`)
  return api.get(`${url}?${queryParamsString}`)
}


export function isAString(value: any) {
  if (!value) {
    return false
  }
  return typeof value === 'string' || value instanceof String
}

export function isADate(value: any) {
  return value instanceof Date
}

export function isABoolean(value: any) {
  return typeof value === 'boolean' || value instanceof Boolean
}

export function isANumber(value: any) {
  if (!value || Number.isNaN(value)) return false
  return typeof value === 'number' || value instanceof Number
}

export function isAUint8Array(obj: any) {
  if (!obj) return false
  return obj !== undefined && obj !== null && obj.constructor === Uint8Array
}

export function isABuffer(value: any) {
  if (value === undefined || value === null) return false
  return Buffer.isBuffer(value)
}

export function isNullOrEmpty(obj: any): boolean {
  if (obj === undefined) {
    return true
  }
  if (obj === null) {
    return true
  }

  if (isAUint8Array(obj)) {
    return obj.length === 0
  }

  if (isABuffer(obj)) {
    return obj.byteLength === 0
  }

  // Check for an empty array too
  // eslint-disable-next-line no-prototype-builtins
  if (obj.hasOwnProperty('length')) {
    if (obj.length === 0) {
      return true
    }
  }
  return Object.keys(obj).length === 0 && obj.constructor === Object
}

export function isAnObject(obj: any) {
  return !isNullOrEmpty(obj) && typeof obj === 'object'
}

/**
 * The reviver function passed into JSON.parse to implement custom type conversions.
 * If the value is a previously stringified buffer we convert it to a Buffer,
 * If its an object of numbers, we convert to UInt8Array {"0":2,"1":209,"2":8 ...}
 * otherwise return the value
 */
export function jsonParseComplexObjectReviver(key: string, value: any) {
  // Convert Buffer
  if (
    value !== null &&
    typeof value === 'object' &&
    'type' in value &&
    value.type === 'Buffer' &&
    'data' in value &&
    Array.isArray(value.data)
  ) {
    return Buffer.from(value.data)
  }

  // Convert number array to UInt8Array e.g. {"0":2,"1":209,"2":8 ...}
  if (value !== null && typeof value === 'object' && !Array.isArray(value) && '0' in value && isANumber(value['0'])) {
    const values = Object.entries(value).map(([, val]) => val)
    // if array only has 8-bit numbers, convert it to UInt8Array
    if (values.every(val => isANumber(val) || val as number < 256)) {
      return new Uint8Array(values as number[])
    }
  }

  // Return parsed value without modifying
  return value
}

/** restore object from JSON serialization (i.e. recrete Buffer properties) */
export function jsonParseAndRevive(value: any) {
  return JSON.parse(value, jsonParseComplexObjectReviver)
}

export function getArrayIndexOrNull(array: any[] = [], index: number) {
  if (!array) return null
  if (array.length > index && !isNullOrEmpty(array[index])) {
    return array[index]
  }
  return null
}

// uses flatted library to allow stringifing on an object with circular references
// NOTE: This does not produce output similar to JSON.stringify, it has it's own format
// to allow you to stringify and parse and get back an object with circular references
export function stringifySafe(obj: any): any {
  return stringify(obj)
}

// this is the inverse of stringifySafe
// if converts a specially stringifyied string (created by stringifySafe) back into an object
export function parseSafe(string: string): any {
  return parse(string)
}

/** Checks that string starts with 0x - removes it if it does */
export function removeHexPrefix(value: string) {
  if (isNullOrEmpty(value)) return value
  return value.startsWith('0x') ? value.slice(2) : value
}

// convert data into buffer object (optional encoding)
export function toBuffer(data: any, encoding: BufferEncoding = 'utf8') {
  let dataToConvert = data
  if (!data) return null
  if (encoding === 'hex') dataToConvert = removeHexPrefix(data)
  return Buffer.from(dataToConvert, encoding)
}

// convert buffer into a string
export function bufferToString(buffer: Buffer, encoding: BufferEncoding = 'utf8') {
  if (!buffer) return null
  return buffer.toString(encoding)
}

// convert buffer into a Uint8Array
export function bufferToUint8Array(buffer: Buffer) {
  if (!buffer) return null
  return new Uint8Array(buffer.buffer)
}

export function uint8ArraysAreEqual(array1: Uint8Array, array2: Uint8Array) {
  return Buffer.compare(array1, array2) === 0
}

/** filter values in array down to an array of a single, uniques value
 * e.g. if array = [{value:'A', other}, {value:'B'}, {value:'A', other}]
 * distinct(array, uniqueKey:'value') => ['A','B']
 */
export function distinctValues(values: Array<any>, uniqueKey: string) {
  return [...new Set(values.map(item => item[uniqueKey]))]
}

/** combine one array into another but only include unique values */
export function addUniqueToArray<T>(array: T[], values: T[]) {
  const arrayFixed = array ?? []
  const valuesFixed = values ?? []
  const set = new Set<T>([...arrayFixed, ...valuesFixed])
  return [...set]
}

/** Typescript Typeguard to verify that the value is in the enumType specified  */
export function isInEnum<T>(enumType: T, value: any): value is T[keyof T] {
  return Object.values(enumType).includes(value as T[keyof T])
}

export function isBase64Encoded(value: any): boolean {
  if (!isAString(value)) return false
  const fromBase64 = Buffer.from(value, 'base64')
  const toBase64 = Buffer.from(fromBase64).toString('base64')
  return toBase64 === value
}
// TODO: Revise. This might base a temporary hack
export function isBase64EncodedAndNotUtf(value: any): boolean {
  if (!isAString(value)) return false
  const fromBase64 = Buffer.from(value, 'base64').toString('utf8')
  const toBase64 = Buffer.from(fromBase64, 'utf8').toString('base64')
  return toBase64 === value
}

export function getUniqueValues<T>(array: T[]) {
  return Array.from(new Set(array.map(item => JSON.stringify(item)))).map(item => jsonParseAndRevive(item))
}

export function trimTrailingChars(value: string, charToTrim: string) {
  if (isNullOrEmpty(value) || !isAString(value)) return value
  const regExp = new RegExp(`${charToTrim}+$`)
  return value.replace(regExp, '')
}

export const removeEmptyValuesInJsonObject = (obj: { [x: string]: any }) => {
  Object.keys(obj).forEach(key => {
    if (obj[key] && typeof obj[key] === 'object') removeEmptyValuesInJsonObject(obj[key])
    // recurse
    // eslint-disable-next-line no-param-reassign
    else if (isNullOrEmpty(obj[key])) delete obj[key] // delete the property
  })
}

export const notImplemented = () => {
  throw new Error('Not Implemented')
}

export const notSupported = (description: string) => {
  throw new Error(`Not Supported ${description}`)
}

/**
 * Returns an the first value from the array if only 1 exists, otherwise returns null
 */
export function getFirstValueIfOnlyOneExists(array: any[]): any {
  const lengthRequirement = 1
  if (!isNullOrEmpty(array) && array.length === lengthRequirement) {
    const [firstValue] = array
    return firstValue
  }

  return null
}

/* Provides a wrapper around a fetch object to allow injection of options into each fetch request
   Returns fetch reponse */
export function fetchWrapper(fetchService: any, globalOptions = {}) {
  // standard fetch interface so that this can be plugged-into any code that accepts a fetch object type
  return async function fetch(url: any, options = {}): Promise<any> {
    const fetchOptions = { ...globalOptions, ...options }
    const response = await fetchService(url, fetchOptions)
    return response
  }
}

/** Generic type for accessing an object by a key e.g. myObject[myKey] = ... */
export type IndexedObject = { [key: string]: any }

/** Conver an array to a JSON object e.g. [{'key1':value1}, {'key2':value2}] =>  {{'key1':value1}, {'key2':value2}} */
export function arrayToObject(array: IndexedObject[]) {
  const result: any = {}
  if (isNullOrEmpty(array)) return null
  array.forEach(header => {
    const key = Object.keys(header)[0]
    result[key] = header[key]
  })
  return result
}

/** returns the number of decimal places in a number (expressed as a string) - supports exponential notiation
 *  e.g. '.05' = 2, '25e-100'= 100. '2.5e-99' = 100 */
export function getDecimalPlacesFromString(num: string = '') {
  const match = num.match(/(?:\.(\d+))?(?:[eE]([+-]?\d+))?$/)
  if (!match) {
    return 0
  }

  return Math.max(
    0,
    // Number of digits right of decimal point.
    (match[1] ? match[1].length : 0) -
      // Adjust for scientific notation.
      (match[2] ? +match[2] : 0),
  )
}

/** Checks if string is a valid hex string
 *
 */
export function isHexString(value: any): Boolean {
  if (!isAString(value)) return false
  const match = value.match(/^(0x|0X)?[a-fA-F0-9]+$/i)
  return !!match
}

/** If input is an object of numbers {'0',123, '1',456}, converts to UInt8Array
 *  Otherwise, input value is just returned
 */
export function ensureJsonArrayOfIntsConvertedToUInt8Array(value: any | Uint8Array) {
  if (isAUint8Array(value)) return value
  if (isAnObject(value)) {
    const values = Object.entries(value).map(([, val]) => val)
    // if array only has 8-bit numbers, convert it to UInt8Array
    if (values.every(val => isANumber(val) || val as number < 256)) {
      return new Uint8Array(values as number[])
    }
  }
  return value
}

/** Converts a hex string to a unit8 byte array */
export function hexStringToByteArray(value: string): Uint8Array {
  return Uint8Array.from(Buffer.from(value, 'hex'))
}

/** Convert a byte array to hex string */
export function byteArrayToHexString(value: Uint8Array): string {
  return Buffer.from(value).toString('hex')
}

/** Convert a byte array array to hex string array */
export function byteArrayArrayToHexStringArray(value: Uint8Array[]): string[] {
  const stringArr: string[] = []
  value.forEach(val => {
    stringArr.push(Buffer.from(val).toString('hex'))
  })
  return stringArr
}

/** Checks that string starts with 0x - appends if not
 *  Also converts hex chars to lowercase for consistency
 */
export function ensureHexPrefix(value: string) {
  if (isNullOrEmpty(value)) return value
  return value.startsWith('0x') ? value.toLowerCase() : `${'0x'}${value.toLowerCase()}`
}

/** Convert a byte array to hex string */
export function bufferToHexString(value: Buffer): string {
  return value.toString('hex')
}

/** Convert a byte array to hex string */
export function bufferToPrefixedHexString(value: Buffer): string {
  return ensureHexPrefix(value.toString('hex'))
}

export function utf8StringToHexString(value: string): string {
  return Buffer.from(value, 'utf8').toString('hex')
}

/** convert a decimal number string to a hex string - supports long decimals (uses BN)
 *  e.g. '16' => '0xA'  */
export function decimalToHexString(value: string) {
  return `0x${new BN(value, 10).toString('hex')}`
}

/** Return true if value is a hexidecimal encoded string (is prefixed by 0x) */
export function hasHexPrefix(value: any): boolean {
  if (!value) return false
  return isAString(value) && (value as string).startsWith('0x')
}

/** makes sure that the public key has a 0x prefix - but drops '04' at front of public key if exists */
export function ensureHexPrefixForPublicKey(value: string) {
  if (isNullOrEmpty(value) || !isAString(value)) return value
  const pubString = value.replace('0x04', '0x').toLowerCase()
  return pubString.startsWith('0x') ? pubString : `${'0x'}${pubString}`
}

/** Converts a decimal string to a hex string
 *  If already hex string, returns same value */
export function toHexStringIfNeeded(value: any) {
  if (!isAString(value) || value.startsWith('0x')) return value
  return decimalToHexString(value)
}

/** Accepts string or Buffer
 *  If string - converts (Utf8 OR Hex string) into Buffer
 *  If buffer - just returns it */
export function convertUtf8OrHexStringToBuffer(data: string | Buffer) {
  if (Buffer.isBuffer(data)) return data
  let dataBytes: Uint8Array
  // convert string into UInt8Array
  if (isHexString(data)) {
    dataBytes = new Uint8Array(Buffer.from(data, 'hex')) // convert hex string (e.g. 'A0D045') to UInt8Array - '0x' prefix is optional
  } else {
    dataBytes = new Uint8Array(Buffer.from(data, 'utf8')) // from 'any UTF8 string' to Uint8Array
  }
  return Buffer.from(dataBytes)
}

/** Whether array is exactly length of 1 */
export function isArrayLengthOne(array: any[]) {
  if (isNullOrEmpty(array)) return false
  return array.length === 1
}

export function objectHasProperty(obj: object, propertyName: string) {
  return Object.keys(obj).some(key => key === propertyName)
}

/** if value is empty (e.g. empty buffer), returns null, otherwise return the value passed-in */
export function nullifyIfEmpty(value: any) {
  if (isNullOrEmpty(value)) return null
  return value
}

/** object is of type BN (big number) */
export function isABN(value: any) {
  return BN.isBN(value)
}

/** convert a balance and decimals into a long value string
 *  e.g. BN('200333300000000000000'), precision=18 -> '200.333' */
export function bigNumberToString(value: BN | BigNumber, precision: number): string {
  const bigValue = new BN(value.toString())
  const precisionBN = new BN(precision)
  const divisor = new BN(10).pow(precisionBN)
  return `${bigValue.div(divisor)}.${bigValue.mod(divisor)}`
}

/** Call the callback once for each item in the array and await for each to finish in turn */
export async function asyncForEach(array: any[], callback: (item: any, index: number, array: any[]) => Promise<any>) {
  for (let index = 0; index < array.length; index += 1) {
    // eslint-disable-next-line @typescript-eslint/semi
    // eslint-disable-next-line no-await-in-loop
    await callback(array[index], index, array)
  }
}


export function bigIntToUint8Array(bn: number) {
  let hex = BigInt(bn.toString()).toString(16)
  if (hex.length % 2) {
    hex = `0${hex}`
  }

  const len = hex.length / 2
  const u8 = new Uint8Array(len)

  let i = 0
  let j = 0
  while (i < len) {
    u8[i] = parseInt(hex.slice(j, j + 2), 16)
    i += 1
    j += 2
  }
  return u8
}

export function uInt8ArrayToInteger(value: Uint8Array) {
  if (isNullOrEmpty(value)) return undefined
  const { length } = value
  return Buffer.from(value).readUIntBE(0, length)
}

/** Pause exectuion for nn miliseconds */
export function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms || 1000))
}

/** Parses a stringified string into a JSON object
 *  Returns Null if parse fails */
export function tryParseJSON(value: any) {
  if (!value || !isAString(value) || value.trim() === '') return null
  try {
    const parsed = JSON.parse(value, jsonParseComplexObjectReviver)
    if (parsed && typeof parsed === 'object') return parsed
  } catch (error) {
    // TODO: should log trace this detail: ('error parsing JSON', { jsonString, doubleQuotes, error });
  }
  return null
}

/* Accepts a JSON object or stringified object and returns a JSON object - if parsing fails, returns null */
export function convertStringifiedOrObjectToObject(value: object | string): object {
  let returnVal: object
  if (value && typeof value === 'string') {
    returnVal = tryParseJSON(value)
  } else {
    returnVal = value as object
  }
  return returnVal
}


/** Accepts hex string checks if a valid ethereum data hex
 *  Returns EthereumPublicKey with prefix
 */
 export function toEthereumTxData(value: string): string {
  return isAString(value) ? ensureHexPrefix(value) : value
}


export function abiToFunctionSignature(methodName: string, abi: any[]): string {
  let inputSignature = ''
  if (isNullOrEmpty(methodName)) {
    throw new Error('abiToFunctionSignature - methodName missing')
  }
  const method = abi.find(m => m.name === methodName)
  if (isNullOrEmpty(method)) {
    throw new Error(`abiToFunctionSignature - method:${methodName} not found in abi`)
  }
  method.inputs.forEach((input: { type: any }) => {
    inputSignature += `${input?.type},`
  })
  inputSignature = inputSignature.slice(0, -1)
  return `${methodName}(${inputSignature})`
}

export function throwNewError(message: string, code?: string, parentError?: Error) {
  let messageToReturn = message
  if (parentError) {
    // add parentError to message
    messageToReturn = `${message} - Parent Error: ${parentError?.message} ${stringifySafe(parentError)}`
  }
  const error = new Error(messageToReturn)
  if (code) {
    error.name = code
  }
  throw error
}