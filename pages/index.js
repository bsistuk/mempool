import React, { useState, useEffect, useRef } from "react";
import SortingTable from "../src/components/Table/SortingTable";
import HomePageHeader from "../src/components/HomepageHeader/HomePageHeader";
import { ethers } from "ethers";
import styled from "styled-components";
import CoinDropdown from "../src/components/SearchAndDropdowns/CoinDropdown";

import {Interface} from '@ethersproject/abi';
import { abi as UniV2Router } from '@uniswap/v2-periphery/build/IUniswapV2Router02.json';
import { abi as UniV3Router } from '../contracts/abi.json';

import GlobalFilter from "../src/components/SearchAndDropdowns/GlobalFilter";
import HomePageSearch from "../src/components/HomepageHeader/HomePageSearch";
import { async } from "regenerator-runtime";

import { media, colors } from "../src/utils/theme";

const _V2_FUNC_SWAP_METHODS = new Array(
  'swapETHForExactTokens',
  'swapExactETHForTokens',
  'swapExactETHForTokensSupportingFeeOnTransferTokens',
  'swapExactTokensForETH',
  'swapExactTokensForETHSupportingFeeOnTransferTokens',
  'swapExactTokensForTokens',
  'swapExactTokensForTokensSupportingFeeOnTransferTokens',
  'swapTokensForExactETH',
  'swapTokensForExactTokens'
);

const _V3_FUNC_SWAP_METHODS = new Array(
  'multicall',
  'exactInputSingle',
  'exactInput',
  'exactOutputSingle',
  'exactOutput'
);

//Same Order
const _V3_FNAME_ONLY_SWAP = new Array(
  'exactInputSingle',
  'exactInput',
  'exactOutputSingle',
  'exactOutput',
  'swapExactTokensForTokens',
  'swapTokensForExactTokens'
);
const _V3_SIGS_ONLY_SWAP = new Array(
  '0x04e45aaf',
  '0xb858183f',
  '0x5023b4df',
  '0x09b81346',
  '0x472b43f3',
  '0x42712a67'
);

const V3_SWAP_FNAME = {
  EIS: 'exactInputSingle',
  EI: 'exactInput',
  EOS: 'exactOutputSingle',
  EO: 'exactOutput',
};

const V3_SWAP_SIGS = {
  exactInputSingleSig: '0x04e45aaf',
  exactInputSig: '0xb858183f',
  exactOutputSingleSig: '0x5023b4df',
  exactOutputSig: '0x09b81346',
  swapExactTokensForTokensSig: '0x472b43f3',
  swapTokensForExactTokensSig: '0x42712a67'
};

const iUniV2Router = new Interface(UniV2Router);
const iUniV3Router = new Interface(UniV3Router);
const checksum = ethers.utils.getAddress;

const {exactInputSig, exactOutputSig, swapExactTokensForTokensSig, swapTokensForExactTokensSig} = V3_SWAP_SIGS;

const NewHome = ({prices }) => {
  const [ list, setList ] = useState([]);
  const [ input_contract, setInput_contract ] = useState('');
  const [ rate, setRate ] = useState(0);
  const [ statuses, setStatuses ] = useState({});
  const [ spinningText, setSpinningText ] = useState();

  const listRef = useRef(list);
  const statusRef = useRef(statuses);
  
  async function getV3InternalSwap(decodeMe) {
    try {
      const innerMethodSig = decodeMe.substring(0, 10);
      const isSwap = _V3_SIGS_ONLY_SWAP.indexOf(innerMethodSig);

      if (isSwap >= 0) {
        const innerMethod = _V3_FNAME_ONLY_SWAP[isSwap];
        const decodedInnerDatas = iUniV3Router.decodeFunctionData(
          innerMethod,
          decodeMe
        );

        const decodedInnerData = decodedInnerDatas[0];
        let fromTokenAddress = null;
        let midTokenAddress = null;
        let toTokenAddress = null;
        let fee = null;
        let checkedPath = [];
        if (innerMethodSig === swapExactTokensForTokensSig || innerMethodSig === swapTokensForExactTokensSig) {
          fromTokenAddress = decodedInnerDatas['path'][0];
          toTokenAddress = decodedInnerDatas['path'][decodedInnerDatas['path'].length - 1];
          checkedPath = [];
        }
        else if (innerMethodSig === exactOutputSig) {
          const path = decodedInnerData['path'];
          fromTokenAddress = checksum('0x' + path.slice(94, 134));
          midTokenAddress = checksum('0x' + path.slice(48, 88));
          toTokenAddress = checksum(path.slice(0, 42));
          checkedPath = [];
        } else if (innerMethodSig === exactInputSig) {
          const path = decodedInnerData['path'];
          fromTokenAddress = checksum(path.slice(0, 42));
          midTokenAddress = checksum('0x' + path.slice(48, 88));
          toTokenAddress = checksum('0x' + path.slice(94, 134));
          checkedPath = [];
        } else {
          fromTokenAddress = checksum(decodedInnerData['tokenIn']);
          toTokenAddress = checksum(decodedInnerData['tokenOut']);
          fee = decodedInnerData['fee'];
        }

        checkedPath.push(fromTokenAddress);
        midTokenAddress && checkedPath.push(midTokenAddress);
        checkedPath.push(toTokenAddress);

        if (checkedPath.length > 0) {
          return {
            checkedPath,
            innerMethod,
            decodedInnerDatas,
            fee,
          };
        }
        //
      }
    } catch (e) {
      console.log('internalSwap', e.message);
    }
    return null;
  }

  const getInputContract = () => {
    return input_contract;
  }

  const setTxList = (data) => {
    data = data.slice(0, 30);
    listRef.current = [...data];
    setList([...data]);
  }

  const setTxStatus = (data) => {
    statusRef.current = {...data};
    setStatuses({...data});
  }

  const updateStatus = async (customWsProvider) => {
    const hash_keys = Object.keys(statusRef.current);
    for (let i = 0; i < hash_keys.length; i ++) {
      const receipt = (await customWsProvider.getTransactionReceipt(hash_keys[i]));
      if(receipt) {
        setTxStatus({...statusRef.current, [hash_keys[i]]: receipt.status});
      } else {
        setTxStatus({...statusRef.current, [hash_keys[i]]: -3});
      }
    }
  }

  const ERC20_ABI = [
    // Read-Only Functions
    "function decimals() view returns (uint8)",
    "function symbol() view returns (string)",
  ];

  const handleInputToken = async (addr, provider) => {
    switch(addr) {
      case '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2':
        return ["ETH", 18];
      case '0xdAC17F958D2ee523a2206206994597C13D831ec7':
        return ["USDT", 6];
      case '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48':
        return ["USDC", 6];
      case '0x6B175474E89094C44Da98b954EedeAC495271d0F':
        return ["DAI", 18];
      default:
        const contract = new ethers.Contract(
          addr,
          ERC20_ABI,
          provider
        );
        let sym = await contract.symbol();
        let dec = await contract.decimals();
        return [sym, dec];
    }
  }

  const init =  (customWsProvider) => {
    
    customWsProvider.on("pending", (tx) => {
      customWsProvider.getTransaction(tx).then(async (transaction) => {
        const input_datas = input_contract.split(',');
        for(let ind = 0; ind < input_datas.length; ind ++){
          const contractAddr = input_datas[ind].trim();
          const contractCode = (await customWsProvider.getCode(contractAddr));
          setSpinningText("Listening...");
          
          if(contractCode != "0x"){
            if(transaction && transaction.to == "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D"){
              // function = res.input.slice(0, 10);
              try {
                let parsedTx = iUniV2Router.parseTransaction(transaction);
                
                if(_V2_FUNC_SWAP_METHODS.includes(parsedTx.functionFragment.name) && _V2_FUNC_SWAP_METHODS[0] == parsedTx.functionFragment.name) {
                  const contract_address = parsedTx.args[1][parsedTx.args[1].length - 1];
                  
                  const tokenAmount = parsedTx.args.amountOutMin || parsedTx.args.amountOut;
                  const ethAmount = parsedTx.value;
                  const gasPrice = transaction.gasPrice;
                  if(contract_address.toLowerCase() == contractAddr.toLowerCase()){
                    const newList = {
                      type: "Buy",
                      date: (await customWsProvider.getBlock(transaction.blockNumber)).timestamp,
                      tokenAmount: "-",
                      priceEth: Number(ethers.utils.formatUnits(ethAmount.toString(), 18)).toFixed(4),
                      priceUsd: (Number(ethers.utils.formatUnits(ethAmount.toString(), 18)) * rate).toFixed(2),
                      maker: transaction.from,
                      gwei: Number(ethers.utils.formatUnits(gasPrice.toString(), 9)).toFixed(4),
                      hash: transaction.hash,
                      status: -1,
                    };
                    if(statusRef.current[transaction.hash] === undefined) {
                      setTxStatus({...statusRef.current, [transaction.hash]: -1});
                      setTxList([newList, ...listRef.current]);
                    }
                  }
                  
                } else if(_V2_FUNC_SWAP_METHODS.includes(parsedTx.functionFragment.name) && _V2_FUNC_SWAP_METHODS[2] == parsedTx.functionFragment.name) {
                  const contract_address = parsedTx.args[1][parsedTx.args[1].length - 1];
                  const tokenAmount = parsedTx.args.amountOutMin || parsedTx.args.amountOut;
                  const ethAmount = parsedTx.value;
                  const gasPrice = transaction.gasPrice;
                  if(contract_address.toLowerCase() == contractAddr.toLowerCase()){
                    const newList = {
                      type: "Buy",
                      date: (await customWsProvider.getBlock(transaction.blockNumber)).timestamp,
                      tokenAmount: "-",
                      priceEth: Number(ethers.utils.formatUnits(ethAmount.toString(), 18)).toFixed(4),
                      priceUsd: (Number(ethers.utils.formatUnits(ethAmount.toString(), 18)) * rate).toFixed(2),
                      maker: transaction.from,
                      gwei: Number(ethers.utils.formatUnits(gasPrice.toString(), 9)).toFixed(4),
                      hash: transaction.hash,
                      status: -1,
                    };
                    if(statusRef.current[transaction.hash] === undefined) {
                      setTxStatus({...statusRef.current, [transaction.hash]: -1});
                      setTxList([newList, ...listRef.current]);
                    }
                    
                  }
                } else if(_V2_FUNC_SWAP_METHODS.includes(parsedTx.functionFragment.name) && _V2_FUNC_SWAP_METHODS[1] == parsedTx.functionFragment.name) {
                  const contract_address = parsedTx.args[1][parsedTx.args[1].length - 1];
                  const tokenAmount = parsedTx.args.amountOutMin || parsedTx.args.amountOut;
                  const ethAmount = parsedTx.value;
                  const gasPrice = transaction.gasPrice;
                  if(contract_address.toLowerCase() == contractAddr.toLowerCase()){
                    const newList = {
                      type: "Buy",
                      date: (await customWsProvider.getBlock(transaction.blockNumber)).timestamp,
                      tokenAmount: "-",
                      priceEth: Number(ethers.utils.formatUnits(ethAmount.toString(), 18)).toFixed(4),
                      priceUsd: (Number(ethers.utils.formatUnits(ethAmount.toString(), 18)) * rate).toFixed(2),
                      maker: transaction.from,
                      gwei: Number(ethers.utils.formatUnits(gasPrice.toString(), 9)).toFixed(4),
                      hash: transaction.hash,
                      status: -1,
                    };
                    if(statusRef.current[transaction.hash] === undefined) {
                      setTxStatus({...statusRef.current, [transaction.hash]: -1});
                      setTxList([newList, ...listRef.current]);
                    }
                    
                  }
                } else if(_V2_FUNC_SWAP_METHODS.includes(parsedTx.functionFragment.name) && _V2_FUNC_SWAP_METHODS[3] == parsedTx.functionFragment.name) {
                  
                  const contract_address = parsedTx.args[2][0];
                  const tokenAmount = parsedTx.args.amountOutMin;
                  const ethAmount = parsedTx.value;
                  const gasPrice = transaction.gasPrice;
                  if(contract_address.toLowerCase() == contractAddr.toLowerCase()){
                    const newList = {
                      type: "Sell",
                      date: (await customWsProvider.getBlock(transaction.blockNumber)).timestamp,
                      tokenAmount: "-",
                      priceEth: Number(ethers.utils.formatUnits(ethAmount.toString(), 18)).toFixed(4),
                      priceUsd: (Number(ethers.utils.formatUnits(ethAmount.toString(), 18)) * rate).toFixed(2),
                      maker: transaction.from,
                      gwei: Number(ethers.utils.formatUnits(gasPrice.toString(), 9)).toFixed(4),
                      hash: transaction.hash,
                      status: -1,
                    };
                    if(statusRef.current[transaction.hash] === undefined) {
                      setTxStatus({...statusRef.current, [transaction.hash]: -1});
                      setTxList([newList, ...listRef.current]);
                    }
                    
                  }
                } else if(_V2_FUNC_SWAP_METHODS.includes(parsedTx.functionFragment.name) && _V2_FUNC_SWAP_METHODS[4] == parsedTx.functionFragment.name) {
                  const contract_address = parsedTx.args[2][0];
                  const tokenAmount = parsedTx.args.amountIn;
                  const ethAmount = parsedTx.value;
                  const gasPrice = transaction.gasPrice;

                  if(contract_address.toLowerCase() == contractAddr.toLowerCase()){
                    const tokenSym = await handleInputToken(contractAddr, customWsProvider);
                    const newList = {
                      type: "Sell",
                      date: (await customWsProvider.getBlock(transaction.blockNumber)).timestamp,
                      tokenAmount: Intl.NumberFormat('en-US', { notation: "compact", maximumFractionDigits: 1 }).format(Number(ethers.utils.formatUnits(tokenAmount.toString(), tokenSym[1]))) + " " + tokenSym[0],
                      priceEth: Number(ethers.utils.formatUnits(ethAmount.toString(), 18)).toFixed(4),
                      priceUsd: (Number(ethers.utils.formatUnits(ethAmount.toString(), 18)) * rate).toFixed(2),
                      maker: transaction.from,
                      gwei: Number(ethers.utils.formatUnits(gasPrice.toString(), 9)).toFixed(4),
                      hash: transaction.hash,
                      status: -1,
                    };
                    if(statusRef.current[transaction.hash] === undefined) {
                      setTxStatus({...statusRef.current, [transaction.hash]: -1});
                      setTxList([newList, ...listRef.current]);
                    }
                    
                  }
                } else if(_V2_FUNC_SWAP_METHODS.includes(parsedTx.functionFragment.name) && _V2_FUNC_SWAP_METHODS[5] == parsedTx.functionFragment.name) {
                  const contract_address = parsedTx.args[2][parsedTx.args[2].length - 1];
                  const tokenAmount = parsedTx.args.amountOutMin || parsedTx.args.amountOut;
                  const ethAmount = parsedTx.value;
                  const gasPrice = transaction.gasPrice;
                  if(contract_address.toLowerCase() == contractAddr.toLowerCase()){
                    const newList = {
                      type: "Buy",
                      date: (await customWsProvider.getBlock(transaction.blockNumber)).timestamp,
                      tokenAmount: "-",
                      priceEth: Number(ethers.utils.formatUnits(ethAmount.toString(), 18)).toFixed(4),
                      priceUsd: (Number(ethers.utils.formatUnits(ethAmount.toString(), 18)) * rate).toFixed(2),
                      maker: transaction.from,
                      gwei: Number(ethers.utils.formatUnits(gasPrice.toString(), 9)).toFixed(4),
                      hash: transaction.hash,
                      status: -1,
                    };
                    if(statusRef.current[transaction.hash] === undefined) {
                      setTxStatus({...statusRef.current, [transaction.hash]: -1});
                      setTxList([newList, ...listRef.current]);
                    }
                    
                  }
                } else if(_V2_FUNC_SWAP_METHODS.includes(parsedTx.functionFragment.name) && _V2_FUNC_SWAP_METHODS[6] == parsedTx.functionFragment.name) {
                  const contract_address = parsedTx.args[2][parsedTx.args[2].length - 1];
                  const tokenAmount = parsedTx.args.amountOutMin || parsedTx.args.amountOut;
                  const ethAmount = parsedTx.value;
                  const gasPrice = transaction.gasPrice;
                  if(contract_address.toLowerCase() == contractAddr.toLowerCase()){
                    const newList = {
                      type: "Buy",
                      date: (await customWsProvider.getBlock(transaction.blockNumber)).timestamp,
                      tokenAmount: "-",
                      priceEth: Number(ethers.utils.formatUnits(ethAmount.toString(), 18)).toFixed(4),
                      priceUsd: (Number(ethers.utils.formatUnits(ethAmount.toString(), 18)) * rate).toFixed(2),
                      maker: transaction.from,
                      gwei: Number(ethers.utils.formatUnits(gasPrice.toString(), 9)).toFixed(4),
                      hash: transaction.hash,
                      status: -1,
                    };
                    if(statusRef.current[transaction.hash] === undefined) {
                      setTxStatus({...statusRef.current, [transaction.hash]: -1});
                      setTxList([newList, ...listRef.current]);
                    }
                    
                  }
                } else if(_V2_FUNC_SWAP_METHODS.includes(parsedTx.functionFragment.name) && _V2_FUNC_SWAP_METHODS[7] == parsedTx.functionFragment.name) {
                  const contract_address = parsedTx.args[2][0];
                  const tokenAmount = parsedTx.args.amountOutMin || parsedTx.args.amountOut;
                  const ethAmount = parsedTx.value;
                  const gasPrice = transaction.gasPrice;
                  if(contract_address.toLowerCase() == contractAddr.toLowerCase()){
                    const newList = {
                      type: "Sell",
                      date: (await customWsProvider.getBlock(transaction.blockNumber)).timestamp,
                      tokenAmount: "-",
                      priceEth: Number(ethers.utils.formatUnits(tokenAmount.toString(), 18)).toFixed(4),
                      priceUsd: (Number(ethers.utils.formatUnits(tokenAmount.toString(), 18)) * rate).toFixed(2),
                      maker: transaction.from,
                      gwei: Number(ethers.utils.formatUnits(gasPrice.toString(), 9)).toFixed(4),
                      hash: transaction.hash,
                      status: -1,
                    };
                    if(statusRef.current[transaction.hash] === undefined) {
                      setTxStatus({...statusRef.current, [transaction.hash]: -1});
                      setTxList([newList, ...listRef.current]);
                    }
                    
                  }
                } else if(_V2_FUNC_SWAP_METHODS.includes(parsedTx.functionFragment.name) && _V2_FUNC_SWAP_METHODS[8] == parsedTx.functionFragment.name) {
                  const contract_address = parsedTx.args[2][parsedTx.args[2].length - 1];
                  const tokenAmount = parsedTx.args.amountOutMin || parsedTx.args.amountOut;
                  const ethAmount = parsedTx.value;
                  const gasPrice = transaction.gasPrice;
                  if(contract_address.toLowerCase() == contractAddr.toLowerCase()){
                    const newList = {
                      type: "Buy",
                      date: (await customWsProvider.getBlock(transaction.blockNumber)).timestamp,
                      tokenAmount: "-",
                      priceEth: Number(ethers.utils.formatUnits(ethAmount.toString(), 18)).toFixed(4),
                      priceUsd: (Number(ethers.utils.formatUnits(ethAmount.toString(), 18)) * rate).toFixed(2),
                      maker: transaction.from,
                      gwei: Number(ethers.utils.formatUnits(gasPrice.toString(), 9)).toFixed(4),
                      hash: transaction.hash,
                      status: -1,
                    };
                    if(statusRef.current[transaction.hash] === undefined) {
                      setTxStatus({...statusRef.current, [transaction.hash]: -1});
                      setTxList([newList, ...listRef.current]);
                    }
                    
                  }
                }
              } catch (e) {
      
              }
              
            }
            else if(transaction && transaction.to == "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45"){
              // function = res.input.slice(0, 10);
              try {
                let parsedTx = iUniV3Router.parseTransaction(transaction);
                
                if(_V3_FUNC_SWAP_METHODS.includes(parsedTx.functionFragment.name) && _V3_FUNC_SWAP_METHODS[0] == parsedTx.functionFragment.name) {
                  const decodedData = parsedTx.args.data;
                  let fromTokenAddress = '';
                  let toTokenAddress = '';
      
                  for (let i = 0; i < decodedData.length; i++) {
                    const internalCall = await getV3InternalSwap(decodedData[i]);
                    if (internalCall) {
                      const { decodedInnerDatas, checkedPath, innerMethod, fee } = internalCall;
                      if (_V3_FNAME_ONLY_SWAP.indexOf(innerMethod) >= 0) {
                        if (fromTokenAddress === '') {
                          fromTokenAddress = checkedPath[0];
                        }
                        toTokenAddress = checkedPath[checkedPath.length - 1];
                        if(fromTokenAddress.toLowerCase() == contractAddr.toLowerCase()) {
                          const buyAmount = decodedInnerDatas['amountOut'] || decodedInnerDatas['amountOutMin'] || decodedInnerDatas[0]['amountOutMinimum'];
                          const outAmount = decodedInnerDatas['amountIn'] || decodedInnerDatas['amountInMax'] || decodedInnerDatas[0]['amountInMaximum'];
                          const tokenSym = await handleInputToken(fromTokenAddress, customWsProvider);
                          
                          const newList = {
                            type: "Sell",
                            date: (await customWsProvider.getBlock(transaction.blockNumber)).timestamp,
                            tokenAmount: Intl.NumberFormat('en-US', { notation: "compact", maximumFractionDigits: 1 }).format(Number(ethers.utils.formatUnits(outAmount.toString(), tokenSym[1]))) + " " + tokenSym[0],
                            priceEth: Number(ethers.utils.formatUnits(buyAmount.toString(), 18)).toFixed(4),
                            priceUsd: (Number(ethers.utils.formatUnits(buyAmount.toString(), 18)) * rate).toFixed(2),
                            maker: transaction.from,
                            gwei: Number(ethers.utils.formatUnits(transaction.gasPrice.toString(), 9)).toFixed(4),
                            hash: transaction.hash,
                            status: -1,
                          };
                          if(statusRef.current[transaction.hash] === undefined) {
                            setTxStatus({...statusRef.current, [transaction.hash]: -1});
                            setTxList([newList, ...listRef.current]);
                          }
                        } else if(toTokenAddress.toLowerCase() == contractAddr.toLowerCase()) {
                          const buyAmount = decodedInnerDatas['amountIn'] || decodedInnerDatas['amountInMax'] || decodedInnerDatas[0]['amountInMaximum'];
                          const outAmount = decodedInnerDatas['amountOut'] || decodedInnerDatas['amountOutMin'] || decodedInnerDatas[0]['amountOutMinimum'];
                          const tokenSym = await handleInputToken(toTokenAddress, customWsProvider);
                          const newList = {
                            type: "Buy",
                            date: (await customWsProvider.getBlock(transaction.blockNumber)).timestamp,
                            tokenAmount: Intl.NumberFormat('en-US', { notation: "compact", maximumFractionDigits: 1 }).format(Number(ethers.utils.formatUnits(outAmount.toString(), tokenSym[1]))) + " " + tokenSym[0],
                            priceEth: Number(ethers.utils.formatUnits(buyAmount.toString(), 18)).toFixed(4),
                            priceUsd: (Number(ethers.utils.formatUnits(buyAmount.toString(), 18)) * rate).toFixed(2),
                            maker: transaction.from,
                            gwei: Number(ethers.utils.formatUnits(transaction.gasPrice.toString(), 9)).toFixed(4),
                            hash: transaction.hash,
                            status: -1,
                          };
                          if(statusRef.current[transaction.hash] === undefined) {
                            setTxStatus({...statusRef.current, [transaction.hash]: -1});
                            setTxList([newList, ...listRef.current]);
                          }
                        }
                      }
                    }
                  }
                  // const contract_address = parsedTx.args[1][1];
                  // const tokenAmount = parsedTx.args.amountOut;
                  // const ethAmount = parsedTx.value;
                  // const gasPrice = transaction.gasPrice;
                  // console.log(parsedTx, transaction, transaction.hash, transaction.from, contract_address, tokenAmount, ethAmount, gasPrice);
                } else {
      
                }
              } catch(e) {
      
              }
              
            }
          } else {
            if(transaction && transaction.data && transaction.data.slice(0, 10) !== "0x"){
              const hexMethodId = transaction.data.slice(0, 10);
              if(transaction.from.toLowerCase() == contractAddr.toLowerCase() || (transaction.to && transaction.to.toLowerCase() == contractAddr.toLowerCase())){
                // console.log(hexMethodId);
                try {
                  const response = await fetch("https://www.4byte.directory/api/v1/signatures/?hex_signature=" + hexMethodId);
                  const { results } = await response.json();
                  const textSig = results[results.length - 1].text_signature.split("(")[0];
                  console.log(results);

                  const newList = {
                    type: textSig,
                    date: (await customWsProvider.getBlock(transaction.blockNumber)).timestamp,
                    tokenAmount: "-",
                    priceEth: "-",
                    priceUsd: "-",
                    maker: transaction.from,
                    gwei: Number(ethers.utils.formatUnits(transaction.gasPrice.toString(), 9)).toFixed(4),
                    hash: transaction.hash,
                    status: -1,
                  };

                  if(statusRef.current[transaction.hash] === undefined) {
                    setTxStatus({...statusRef.current, [transaction.hash]: -1});
                    setTxList([newList, ...listRef.current]);
                  }
                } catch(e) {

                }
                
              }
              
            }
            // if(transaction && (transaction.from.toLowerCase() == input_contract.toLowerCase() || transaction.to.toLowerCase() == input_contract.toLowerCase())){
              
            // }
            
          }
        }
      });
    });

  };

  useEffect( () => {
    // const newList = {
    //   type: "Buy",
    //   date: (await customWsProvider.getBlock(transaction.blockNumber)).timestamp,
    //   priceEth: "0.001",
    //   priceUsd: "1.2",
    //   maker: "0x2dD2162Ec9D37ab105CAAB9FFA5aB5eB5a4b0D2c",
    //   gwei: "1.3",
    //   hash: "0xaf75d1799f30df2f751e440dd410049d51ab06d6d523beca159dc503312f7410"
    // }
    // setList([...list, newList])
    const customWsProvider = new ethers.providers.WebSocketProvider('wss://eth-mainnet.g.alchemy.com/v2/wR0x9Tkv4Q3UKNAL9dIIj6RA3Co4mylw');
    const interval = setInterval(() => {
      updateStatus(customWsProvider);
    }, 2000);

    (async () => {
      const rates = await fetch("https://api.coinbase.com/v2/exchange-rates?currency=ETH");
      const rate = await rates.json();
      setRate(rate.data.rates.USD);
    })();

    return () => {customWsProvider && customWsProvider.removeAllListeners('pending'); clearInterval(interval);}

  }, []);

  const searchTx = () => {
    let customWsProvider;
    if(input_contract){
      setSpinningText("Connecting Node...");
      customWsProvider = new ethers.providers.WebSocketProvider('wss://eth-mainnet.g.alchemy.com/v2/wR0x9Tkv4Q3UKNAL9dIIj6RA3Co4mylw');
      setList([]);
      customWsProvider.removeAllListeners('pending');
      init(customWsProvider);
    }
  }

  return(
  <div>
    <HomePageHeader />
      <HomePageSearch>
        <HomePageSearchInput
          value={input_contract}
          placeholder="Search your transaction, an address or a block"
          onChange={(e) => {
            setInput_contract(e.target.value)
          }}
        />
          <DesktopOptionsWrapper>
            <CoinDropdown marginRight clickSearch={searchTx} />
          </DesktopOptionsWrapper>
      </HomePageSearch>
    <LoadingText>{spinningText}</LoadingText>
    <SortingTable transactions={list} prices={prices} statuses={statuses} />
  </div>
)};

const LoadingText = styled.span`
  color: white;
  display: flex;
  justify-content: center;
  margin-top: -20px;
  margin-bottom: 15px;
`

const HomePageSearchInput = styled.input`
  touch-action: manipulation;
  border: none;
  display: flex;
  flex: 1 1 0%;
  background-color: #090909;
  color: white;
  margin: 0px 10px 0px 0px;
  font-size: 18px;
  overflow: visible;
  &:focus {
    outline: none;
  }
`;

const DesktopOptionsWrapper = styled.div`
  display: flex;
  ${media.tablet`
    display: none;
  `}
`;

export default NewHome;
