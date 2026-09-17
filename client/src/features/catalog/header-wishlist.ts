export function headerWishlistPath(authenticated: boolean) {
  return authenticated ? "/account#wishlist" : "/account";
}
