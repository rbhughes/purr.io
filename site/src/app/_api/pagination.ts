// import { Buffer } from "buffer";

// class PaginationManager {
//   private token: string | null = null;

//   generateToken(metadata: Record<string, any>): string | null {
//     if (!metadata || !metadata.paginationToken) return null;

//     try {
//       const tokenDict = JSON.parse(
//         Buffer.from(metadata.paginationToken, "base64").toString()
//       );

//       // Match Python's second-based timestamp
//       const tokenData = {
//         timestamp: Math.floor(Date.now() / 1000), // Convert to seconds
//         ...tokenDict,
//       };

//       return Buffer.from(JSON.stringify(tokenData)).toString("base64");
//     } catch (e) {
//       console.error("Token generation failed:", e);
//       return null;
//     }
//   }

//   validateToken(token: string | null): Record<string, any> | null {
//     if (!token) return null;

//     try {
//       const decoded = JSON.parse(Buffer.from(token, "base64").toString());

//       // Use second-based validation
//       if (Math.floor(Date.now() / 1000) - decoded.timestamp > 3600) {
//         return null;
//       }
//       return decoded;
//     } catch (e) {
//       console.error("Token validation failed:", e);
//       return null;
//     }
//   }

//   get currentToken(): string | null {
//     return this.token;
//   }

//   set currentToken(value: string | null) {
//     this.token = value;
//   }
// }

// export default PaginationManager;

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
