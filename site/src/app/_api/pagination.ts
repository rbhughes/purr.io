class PaginationManager {
  private token: string | null = null;

  get currentToken(): string | null {
    return this.token;
  }

  set currentToken(value: string | null) {
    this.token = value;
  }
}

export default PaginationManager;
