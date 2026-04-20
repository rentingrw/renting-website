/**
 * Open-source stock images from Unsplash (https://unsplash.com/license)
 * Free to use, no attribution required.
 */

export const stockImages = {
  /** Hero: premium car / car rental */
  heroCar:
    'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=1200&auto=format&fit=crop',
  /** Car interior for driver booking cards */
  carInterior:
    'https://images.unsplash.com/photo-1502877338535-766e1452684a?w=800&auto=format&fit=crop',
  /** Fallback car image */
  carPlaceholder:
    'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=800&auto=format&fit=crop',
  /** Car images for listings by vehicle type */
  cars: {
    sedan:
      'https://images.unsplash.com/photo-1555215695-3004980ad54e?w=800&auto=format&fit=crop',
    suv:
      'https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?w=800&auto=format&fit=crop',
    hatchback:
      'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=800&auto=format&fit=crop',
    pickup:
      'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=800&auto=format&fit=crop',
    van:
      'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=800&auto=format&fit=crop',
    truck:
      'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=800&auto=format&fit=crop',
  } satisfies Record<string, string>,
  /** Driver profile photos - professional headshots */
  drivers: [
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop', // man
    'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&auto=format&fit=crop', // woman
    'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&auto=format&fit=crop', // man
    'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&auto=format&fit=crop', // woman
  ],
} as const;
