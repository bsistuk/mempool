import {
  formatDateCell,
  CurrencyCell,
  TruncateTransactionCell,
} from "../../utils/formatTransactionData";

let color = ""

export const COLUMNS = [
  {
    Header: "Type",
    Footer: "Type",
    accessor: "type",
    Cell: ({ value }) => {
      if(value == "Buy"){
        color = "green";
      } else if(value == "Sell") {
        color = "red";
      } else {
        color = "yellow";
      }
      return <span style={{color: color, wordBreak: "break-all"}}>{value}</span>;
    },
  },
  {
    Header: "Status",
    Footer: "Status",
    accessor: "status",
    Cell: ({ value }) => {
      if(value == -1 || value == -3){
        return "⌛️";
      } else if(value == 1) {
        return "✔️";
      } else {
        return "❌";
      }
    }  
  },
  {
    Header: "Date",
    Footer: "Date",
    accessor: "date",
    Cell: ({ value }) => <span style={{color: color}}>{formatDateCell(value)}</span>,
    // Cell: ({ value }) => <span style={{color: color}}>{value}</span>,
  },
  {
    Header: "Price ETH",
    Footer: "Price ETH",
    accessor: "priceEth",
    Cell: ({ value }) => <span style={{color: color}}>{value}</span>,
  },
  {
    Header: "price USD",
    Footer: "price USD",
    accessor: "priceUsd",
    Cell: ({ value }) => <span style={{color: color}}>{value}</span>,
  },
  {
    Header: "Token Amount",
    Footer: "Token Amount",
    accessor: "tokenAmount",
    Cell: ({ value }) => {
      if(value.slice(-1) == "-"){
        return <span style={{color: color}}>{"-"}</span>;
      }
      return <span style={{color: color}}>{value}</span>;
    },
    // Cell: ({ value }) => <span style={{color: color}}>{value}</span>,
  },
  {
    Header: "Maker",
    Footer: "Maker",
    accessor: "maker",
    Cell: ({ value }) => <span style={{color: color}}>{value.slice(0,8) + "..." + value.slice(-6)}</span>,
  },
  {
    Header: "Gwei",
    Footer: "Gwei",
    accessor: "gwei",
    Cell: ({ value }) => <span style={{color: "orange"}}>{value}</span>,
  },
  {
    Header: "Etherscan",
    Footer: "Etherscan",
    accessor: "hash",
    Cell: ({ value }) => <a href={"https://etherscan.io/tx/"+value} target="_blank" rel="noreferrer"><img src="/img/etherscan.png" width={"20"}></img></a>,
  },
];

export default COLUMNS;
