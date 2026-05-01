/**
 * Party color map for Indian political parties.
 */
export const PARTY_COLORS = {
  BJP:   '#FF6600',
  INC:   '#00BFFF',
  AAP:   '#0080FF',
  BSP:   '#0000FF',
  SP:    '#FF0000',
  TMC:   '#45B7D1',
  NCP:   '#00FF7F',
  DMK:   '#CC0000',
  AIDMK: '#000080',
  AIADMK:'#000080',
  JDU:   '#00CC66',
  TDP:   '#FFFF00',
  YSR:   '#00CC99',
  YSRCP: '#00CC99',
  BRS:   '#FF69B4',
  SHS:   '#FF9900',
  SS:    '#FF9900',
};

export function getPartyColor(party) {
  if (!party) return '#888888';
  const abbr = party.trim().toUpperCase();
  return PARTY_COLORS[abbr] || '#888888';
}
