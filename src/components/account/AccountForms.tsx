'use client';
import { ActionForm } from '@/components/ActionForm';
import { changePassword, updateProfile } from '@/actions/account';
import { changePasswordSchema, profileSchema } from '@/lib/validation/account';

export function AccountForms({
  name,
  hasAvatar,
}: {
  name: string;
  hasAvatar: boolean;
}) {
  return (
    <div className="space-y-8">
      <section
        aria-labelledby="profile-heading"
        className="border-t border-border pt-6"
      >
        <h2 id="profile-heading" className="text-base font-semibold">
          Profile
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Choose a JPG, PNG or WebP photo, up to 2 MB.
        </p>
        <ActionForm
          action={updateProfile}
          schema={profileSchema}
          label="Save profile"
          success="Profile updated."
          fields={[
            {
              name: 'name',
              label: 'Name',
              autoComplete: 'name',
              maxLength: 80,
              defaultValue: name,
            },
            {
              name: 'avatar',
              label: 'Profile photo',
              type: 'file',
              accept: 'image/jpeg,image/png,image/webp',
              required: false,
            },
          ]}
        >
          {hasAvatar && (
            <label className="flex min-h-11 items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="removeAvatar"
                className="size-4 accent-primary"
              />{' '}
              Remove current photo
            </label>
          )}
        </ActionForm>
      </section>
      <section
        aria-labelledby="password-heading"
        className="border-t border-border pt-6"
      >
        <h2 id="password-heading" className="text-base font-semibold">
          Change password
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Use at least 8 characters and at most 72 bytes.
        </p>
        <ActionForm
          action={changePassword}
          schema={changePasswordSchema}
          label="Change password"
          success="Password changed."
          fields={[
            {
              name: 'currentPassword',
              label: 'Current password',
              type: 'password',
              autoComplete: 'current-password',
              maxLength: 72,
            },
            {
              name: 'newPassword',
              label: 'New password',
              type: 'password',
              autoComplete: 'new-password',
              maxLength: 72,
            },
            {
              name: 'confirmPassword',
              label: 'Confirm new password',
              type: 'password',
              autoComplete: 'new-password',
              maxLength: 72,
            },
          ]}
        />
      </section>
    </div>
  );
}
