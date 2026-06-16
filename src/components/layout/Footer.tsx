interface FooterProps {
  onTeamClick: () => void;
  onTermsClick: () => void;
  onPrivacyClick: () => void;
}

export function Footer({ onTeamClick, onTermsClick, onPrivacyClick }: FooterProps) {
  return (
    <footer className="w-full py-6 mt-auto shrink-0 z-10 border-t border-border/10 bg-background/20 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-6">
        <p className="text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} GradeSnap. All rights reserved.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-6 text-sm font-medium text-muted-foreground">
          <button 
            onClick={onTeamClick} 
            className="transition-colors hover:text-foreground"
          >
            Our Team
          </button>
          <button 
            onClick={onTermsClick} 
            className="transition-colors hover:text-foreground"
          >
            Terms of Service
          </button>
          <button 
            onClick={onPrivacyClick} 
            className="transition-colors hover:text-foreground"
          >
            Privacy Policy
          </button>
        </div>
      </div>
    </footer>
  );
}
