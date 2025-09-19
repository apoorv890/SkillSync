import ProfileHeader from "../components/profile/profile-header";
import ProfileContent from "../components/profile/profile-content";

export default function ProfilePage() {
  return (
    <div className="@container/main flex flex-1 flex-col gap-2">
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <div className="px-4 lg:px-6">
          <div className="mx-auto max-w-4xl space-y-6">
            <ProfileHeader />
            <ProfileContent />
          </div>
        </div>
      </div>
    </div>
  );
}
