import React, { PureComponent } from "react";
import styled from "styled-components";
import { colors, media } from "../../utils/theme";

export default class Layout extends PureComponent {
  render() {
    return (
      <div className="layout">
        {this.props.children}
      </div>
    );
  }
}

const LinkTag = styled.a`
  text-decoration: none;
  color: ${colors.white1};
`;

const HeaderContainer = styled.div`
  position: relative;
  box-sizing: content-box;
  margin: 0px auto;
  max-width: 1400px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0px 1rem;
  width: 100%;
  height: 4.75rem;
  ${media.larger`
    padding: 0px 40px;
  `}
`;

const HeaderComponent = styled.header`
  display: flex;
  margin: 0px auto;
  width: 100%;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  z-index: 2;
  background-color: ${colors.black2};
  position: absolute;
  top: 0px;
`;

const HeaderSVG = styled.svg`
  color: ${colors.white1};
`;
