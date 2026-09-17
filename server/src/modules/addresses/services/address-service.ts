import type { AddressInput, AddressRepository, AddressUpdateInput } from "../address.repository.js";

export class AddressService {
  constructor(private readonly repository: AddressRepository) {}

  async create(input: AddressInput & { accountId: string }) {
    return this.repository.create(input);
  }

  async list(accountId: string) {
    return this.repository.list(accountId);
  }

  async update(input: AddressUpdateInput & { accountId: string; addressId: string }) {
    return this.repository.update(input);
  }

  async selectDefault(input: { accountId: string; addressId: string }) {
    return this.repository.selectDefault(input);
  }

  async remove(input: { accountId: string; addressId: string }) {
    return this.repository.remove(input);
  }
}
