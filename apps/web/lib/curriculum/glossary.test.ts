import { describe, expect, it } from "vitest";

import { LESSONS } from "./lessons";
import { GLOSSARY, glossaryAt } from "./glossary";

const idAt = (line: string, column: number) => glossaryAt(line, column)?.entry.id ?? null;

describe("glossaryAt", () => {
  it("finds the token under the cursor, with its range", () => {
    expect(glossaryAt("sol_storage! {", 3)).toMatchObject({ entry: { id: "sol_storage" }, startColumn: 1, endColumn: 13 });
    expect(idAt("    #[entrypoint]", 8)).toBe("entrypoint");
    expect(idAt("#[public]", 1)).toBe("public");
  });

  it("explains #[constructor]", () => {
    expect(glossaryAt("    #[constructor]", 8)).toMatchObject({ entry: { id: "constructor" }, startColumn: 5, endColumn: 19 });
    expect(idAt("    pub fn constructor(&mut self, owner: Address) {", 12)).toBeNull();
  });

  it("explains receiving and sending ETH", () => {
    expect(idAt("    #[payable]", 7)).toBe("payable");
    const total = "        let total = self.deposits.get(account) + self.vm().msg_value();";
    expect(idAt(total, total.indexOf("msg_value") + 1)).toBe("msg_value");
    const held = "        self.vm().balance(self.vm().contract_address())";
    expect(idAt(held, held.indexOf("balance") + 1)).toBe("balance");
    expect(idAt(held, held.indexOf("contract_address") + 1)).toBe("contract_address");
    const send = "        transfer_eth(self.vm(), account, amount)?;";
    expect(idAt(send, send.indexOf("transfer_eth") + 1)).toBe("transfer_eth");
    expect(idAt("    pub fn balance(&self) -> U256 {", 12)).toBeNull();
  });

  it("explains checked arithmetic and the gas left", () => {
    const scaled = "        let scaled = amount.checked_mul(rate_bps)";
    expect(idAt(scaled, scaled.indexOf("checked_mul") + 1)).toBe("checked");
    const sum = "a.checked_add(b)";
    expect(idAt(sum, sum.indexOf("checked_add") + 1)).toBe("checked");
    expect(idAt("let checked_mul = 1;", 5)).toBeNull();
    expect(idAt("self.vm().evm_gas_left()", 11)).toBe("gas_left");
    expect(idAt("self.vm().evm_ink_left()", 11)).toBe("gas_left");
  });

  it("explains the ink price, ink conversions and panics", () => {
    const price = "        self.vm().tx_ink_price()";
    expect(idAt(price, price.indexOf("tx_ink_price") + 1)).toBe("ink_price");
    const gas = "        self.vm().ink_to_gas(ink)";
    expect(idAt(gas, gas.indexOf("ink_to_gas") + 1)).toBe("ink_conversion");
    const ink = "        self.vm().gas_to_ink(gas)";
    expect(idAt(ink, ink.indexOf("gas_to_ink") + 1)).toBe("ink_conversion");
    expect(idAt("    pub fn to_gas(&self, ink: u64) -> u64 {", 12)).toBeNull();
    const expect_ = '        let ink = items.checked_mul(ink_per_item).expect("budget overflow");';
    expect(idAt(expect_, expect_.indexOf("expect") + 1)).toBe("panic");
    const unwrap = "        let first = self.batch.get(0).unwrap();";
    expect(idAt(unwrap, unwrap.indexOf("unwrap") + 1)).toBe("panic");
    expect(idAt("let unwrap = 1;", 5)).toBeNull();
  });

  it("explains U256::MAX apart from U256", () => {
    const guard = "        if allowed != U256::MAX {";
    expect(glossaryAt(guard, guard.indexOf("MAX") + 1)).toMatchObject({ entry: { id: "u256_max" }, startColumn: guard.indexOf("U256") + 1 });
    expect(idAt(guard, guard.indexOf("U256") + 1)).toBe("u256_max");
    expect(idAt("        U256::ZERO", 9)).toBe("u256");
  });

  it("explains the zero address and is_zero()", () => {
    const guard = "        if to == Address::ZERO {";
    expect(glossaryAt(guard, guard.indexOf("ZERO") + 1)).toMatchObject({ entry: { id: "address_zero" }, startColumn: guard.indexOf("Address") + 1 });
    const signature = "    pub fn owner_of(&self, token_id: U256) -> Result<Address, Erc721Error> {";
    expect(idAt(signature, signature.indexOf("Address") + 1)).toBe("address");
    const test = "        if owner.is_zero() {";
    expect(idAt(test, test.indexOf("is_zero") + 1)).toBe("is_zero");
    expect(idAt("fn is_zero() {}", 4)).toBeNull();
  });

  it("explains #[storage] and #[implements(...)]", () => {
    expect(glossaryAt("#[storage]", 3)).toMatchObject({ entry: { id: "storage" }, startColumn: 1, endColumn: 11 });
    const routes = "#[implements(IErc20<Error = erc20::Error>, IErc20Metadata, IErc165)]";
    expect(glossaryAt(routes, 4)).toMatchObject({ entry: { id: "implements" }, startColumn: 1, endColumn: 14 });
    expect(idAt("    erc20: Erc20,", 7)).toBeNull();
  });

  it("explains #[selector] and 80-bit integers", () => {
    const attribute = '    #[selector(name = "latestRoundData")]';
    expect(glossaryAt(attribute, 7)).toMatchObject({ entry: { id: "selector" }, startColumn: 5, endColumn: 16 });
    const signature = "    pub fn latest_round(&self) -> (U80, I256, U256, U256, U80) {";
    expect(idAt(signature, signature.indexOf("U80") + 1)).toBe("u80");
    expect(idAt("        uint80 round_id;", 10)).toBe("uint80");
    expect(idAt("    pub fn selector(&self) {}", 12)).toBeNull();
  });

  it("explains sol_interface!, call configurations and signed integers", () => {
    expect(idAt("sol_interface! {", 3)).toBe("sol_interface");
    const call = "        Ok(feed.decimals(self.vm(), Call::new())?)";
    expect(glossaryAt(call, call.indexOf("Call") + 1)).toMatchObject({ entry: { id: "call_config" }, startColumn: call.indexOf("Call") + 1 });
    const mutating = "        let config = Call::new_mutating(self);";
    expect(idAt(mutating, mutating.indexOf("new_mutating") + 1)).toBe("call_config");
    expect(idAt("        if answer <= I256::ZERO {", 22)).toBe("i256");
    const signature = "    error NegativePrice(int256 answer);";
    expect(idAt(signature, signature.indexOf("int256") + 1)).toBe("int256");
    expect(idAt("        uint256 max_age;", 10)).toBe("uint256");
  });

  it("tells sol! apart from sol_storage!", () => {
    expect(idAt("sol! {", 2)).toBe("sol");
    expect(idAt("sol_storage! {", 2)).toBe("sol_storage");
  });

  it("matches log only as vm().log", () => {
    const line = "        self.vm().log(Transfer { from, to, value });";
    expect(idAt(line, line.indexOf("log") + 1)).toBe("log");
    expect(idAt(line, line.indexOf("vm") + 1)).toBe("vm");
    expect(idAt("let log = 1;", 5)).toBeNull();
  });

  it("matches insert and delete only as method calls", () => {
    const write = "        self.scores.insert(player, total);";
    expect(idAt(write, write.indexOf("insert") + 1)).toBe("insert");
    const clear = "        self.scores.delete(player);";
    expect(idAt(clear, clear.indexOf("delete") + 1)).toBe("delete");
    expect(idAt("insert(player, total);", 1)).toBeNull();
    expect(idAt("let delete = 1;", 5)).toBeNull();
  });

  it("explains a vector declaration as a whole, and the vector methods", () => {
    expect(glossaryAt("        uint256[] prices;", 10)).toMatchObject({ entry: { id: "vector" }, startColumn: 9, endColumn: 18 });
    expect(idAt("        uint256 count;", 10)).toBe("uint256");
    const push = "        self.prices.push(price);";
    expect(idAt(push, push.indexOf("push") + 1)).toBe("push");
    const pop = "        self.prices.pop();";
    expect(idAt(pop, pop.indexOf("pop") + 1)).toBe("pop");
    const len = "        U256::from(self.prices.len())";
    expect(idAt(len, len.indexOf("len") + 1)).toBe("len");
    expect(idAt("let pop = 1;", 5)).toBeNull();
  });

  it("explains grow and getter on structs", () => {
    const grow = "        let mut task = self.tasks.grow();";
    expect(idAt(grow, grow.indexOf("grow") + 1)).toBe("grow");
    const read = "        let task = self.tasks.getter(id).ok_or(TodoError::UnknownTask(UnknownTask { id }))?;";
    expect(idAt(read, read.indexOf("getter") + 1)).toBe("getter");
    expect(idAt("        Task[] tasks;", 10)).toBe("vector");
    expect(idAt("let grow = 1;", 5)).toBeNull();
  });

  it("explains the message and block context", () => {
    const now = "        let now = U256::from(self.vm().block_timestamp());";
    expect(idAt(now, now.indexOf("block_timestamp") + 1)).toBe("block_timestamp");
    const number = "U256::from(self.vm().block_number())";
    expect(idAt(number, number.indexOf("block_number") + 1)).toBe("block_number");
    const origin = "let is_owner = self.vm().tx_origin() == owner;";
    expect(idAt(origin, origin.indexOf("tx_origin") + 1)).toBe("tx_origin");
    expect(idAt("let block_number = 1;", 5)).toBeNull();
  });

  it("explains an address storage field, but not address in a mapping or an event", () => {
    expect(glossaryAt("        address last_visitor;", 10)).toMatchObject({ entry: { id: "address_field" }, startColumn: 9, endColumn: 16 });
    expect(idAt("        mapping(address => uint256) check_ins;", 18)).toBeNull();
    expect(idAt("    event Transfer(address indexed from, address indexed to, uint256 value);", 21)).toBeNull();
  });

  it("does not match inside longer identifiers", () => {
    expect(idAt("let my_U256x = 1;", 8)).toBeNull();
    expect(idAt("uint2567", 2)).toBeNull();
  });

  it("returns null between tokens", () => {
    expect(idAt("pub fn get(&self) -> U256 {", 2)).toBeNull();
  });

  it("uses only patterns safe to reuse", () => {
    for (const entry of GLOSSARY) {
      expect(entry.pattern.global || entry.pattern.sticky, entry.id).toBe(false);
    }
  });

  it("explains the key tokens of every lesson's starter code", () => {
    const starters = LESSONS.flatMap((lesson) => (lesson.available ? [lesson.exercise.starterCode] : [])).join("\n");
    for (const id of ["sol_storage", "entrypoint", "public", "cfg_attr", "alloc", "prelude", "u256", "sol", "solidity_error"]) {
      const entry = GLOSSARY.find((candidate) => candidate.id === id)!;
      expect(entry.pattern.test(starters), id).toBe(true);
    }
  });
});
