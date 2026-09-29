import type { Account } from '@/types'

/**
 * The site an account belongs to: the key two accounts share when they are the
 * same site, and the label to show for it.
 *
 * Importers write issuers inconsistently — andOTP exports "Microsoft -
 * Microsoft" where the app itself writes "Microsoft" — so comparing the issuer
 * as-is splits one site into two groups. When the issuer has a " - " segment the
 * part before it is the site (importers commonly append the account or the app
 * name there).
 */
export function siteIdentityOf(account: Account): { key: string; label: string } {
  const source = (account.issuer || account.name || '').trim()
  const label = source.split(' - ')[0].trim() || source
  const key = label.toLowerCase().replace(/\s+/g, ' ')

  // An account with neither issuer nor name still needs a group of its own.
  return { key: key || account.id, label: label || account.name }
}