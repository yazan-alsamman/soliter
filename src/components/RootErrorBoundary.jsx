import { Component } from "react";

export class RootErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-rose-50 text-rose-950" dir="rtl">
          <h1 className="text-xl font-bold mb-2">تعطل تحميل التطبيق</h1>
          <pre
            className="text-sm whitespace-pre-wrap max-w-lg bg-white/80 p-4 rounded-xl border border-rose-200 font-mono"
            dir="ltr"
          >
            {String(this.state.error?.message || this.state.error)}
          </pre>
          <p className="mt-4 text-sm text-rose-800">افتح أدوات المطوّر (F12) → Console لمزيد التفاصيل.</p>
        </div>
      );
    }
    return this.props.children;
  }
}
