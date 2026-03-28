const Footer = () => (
  <footer className="border-t border-border py-8 mt-auto">
    <div className="container mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
      <p className="max-w-xl text-center sm:text-left">
        Estimates depend on your plan and insurer rules; confirm with your plan documents.
      </p>
      <div className="flex gap-4">
        <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
        <a href="#" className="hover:text-foreground transition-colors">Terms</a>
      </div>
    </div>
  </footer>
);

export default Footer;
