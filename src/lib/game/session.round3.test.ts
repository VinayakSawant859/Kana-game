import { describe, expect, it } from "vitest";
import type { KanaCharacter } from "@/data/kana";
import { createSessionState, sessionReducer } from "./session";

const deck: KanaCharacter[] = [
  { id:"hiragana-あ", char:"あ", script:"hiragana", group:"basic", row:"vowel", romaji:["a"] },
  { id:"hiragana-い", char:"い", script:"hiragana", group:"basic", row:"vowel", romaji:["i"] },
  { id:"hiragana-う", char:"う", script:"hiragana", group:"basic", row:"vowel", romaji:["u"] },
];

describe("round 3 result invariants", () => {
  it("records correct and retry statuses", () => {
    let state=createSessionState(deck,1000);
    state=sessionReducer(state,{type:"SUBMIT",answer:"a"});
    expect(state.cards[0].status).toBe("correct-first-try");
    state=sessionReducer(state,{type:"ADVANCE"});
    state=sessionReducer(state,{type:"SUBMIT",answer:"bad"});
    expect(state.cards[1].status).toBe("pending");
    state=sessionReducer(state,{type:"SUBMIT",answer:"i"});
    expect(state.cards[1].status).toBe("correct-after-retry");
  });
  it("END marks current unfinished, future cards not reached, and preserves mistakes", () => {
    let state=createSessionState(deck,1000);
    state=sessionReducer(state,{type:"SUBMIT",answer:"bad"});
    state=sessionReducer(state,{type:"END"});
    expect(state.cards[0].status).toBe("unfinished");
    expect(state.cards[0].mistakes).toBe(1);
    expect(state.cards[1].status).toBe("not-reached");
    expect(state.cards[2].status).toBe("not-reached");
    expect(state.cards.filter((card)=>["unfinished","not-reached"].includes(card.status)).length).toBe(3);
  });
  it("counts add up and mistakes sum per card", () => {
    let state=createSessionState(deck,1000);
    state=sessionReducer(state,{type:"SUBMIT",answer:"a"});
    state=sessionReducer(state,{type:"ADVANCE"});
    state=sessionReducer(state,{type:"SKIP"});
    state=sessionReducer(state,{type:"END"});
    const counts={passedFirst:state.cards.filter(c=>c.status=== "correct-first-try").length,skipped:state.cards.filter(c=>c.status=== "skipped").length,unfinished:state.cards.filter(c=>c.status=== "unfinished").length,notReached:state.cards.filter(c=>c.status=== "not-reached").length};
    expect(counts.passedFirst+counts.skipped+counts.unfinished+counts.notReached).toBe(deck.length);
    expect(state.cards.reduce((sum,c)=>sum+c.mistakes,0)).toBe(0);
  });
});
