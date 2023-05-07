import React from "react";
import styled from "styled-components";
import { colors } from "../../utils/theme";

const HomePageHeader = () => {
  return (
    <HomePageHeaderContainer>
      <HomePageHeaderWrapper>
        <HomePageHeaderContent>
          <HomePageHeaderTitle>The Matrix</HomePageHeaderTitle>
        </HomePageHeaderContent>
      </HomePageHeaderWrapper>
    </HomePageHeaderContainer>
  );
};

const HomePageHeaderContainer = styled.div`
  padding-top: 0rem;
  background-color: ${colors.black1};
  color: ${colors.grey2};
`;

const HomePageHeaderWrapper = styled.div`
  box-sizing: content-box;
  max-width: 62.5rem;
  margin: 0px auto;
  padding: 0px 2.5rem;
`;

const HomePageHeaderContent = styled.div`
  padding: 1rem 0px;
`;

const HomePageHeaderTitle = styled.h1`
  color: ${colors.white1};
  margin-bottom: 3.5rem;
  font-size: 2rem;
  font-weight: 600;
  line-height: 1.625rem;
  text-align: center;
`;

export default HomePageHeader;
