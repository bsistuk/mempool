import React, { useState, useEffect } from "react";
import DropdownContainer from "./DropdownContainer";

const TransactionDropdown = ({ setFilter }) => {
  const [transaction, setTransaction] = useState("noFilter");

  useEffect(() => {
    
  }, [transaction, setTransaction]);

  return (
    <DropdownContainer>
      <select onChange={(e) => setTransaction(e.target.value)}>
        <option value="noFilter">All Transactions</option>
        <option value="custodial">Custodial</option>
        <option value="nonCustodial">Non Custodial</option>
      </select>
    </DropdownContainer>
  );
};

export default TransactionDropdown;
