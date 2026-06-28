import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("HfiPayModule", (m) => {
  const contract = m.contract("HfiPayEscrow");
  return { contract };
});
